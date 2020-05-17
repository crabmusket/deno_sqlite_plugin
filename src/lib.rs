use deno_core::plugin_api::Buf;
use deno_core::plugin_api::Interface;
use deno_core::plugin_api::Op;
use deno_core::plugin_api::ZeroCopyBuf;

use rusqlite::{Connection, types::ValueRef, types::Value as SqliteValue};

use std::cell::RefCell;
use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use serde_json::value::Value as JsonValue;

thread_local! {
  static CONNECTION_INDEX: RefCell<u32> = RefCell::new(0);
  static CONNECTION_MAP: RefCell<HashMap<u32, Connection>> = RefCell::new(HashMap::new());
}

#[no_mangle]
pub fn deno_plugin_init(interface: &mut dyn Interface) {
  interface.register_op("tag:crabmusket.github.io,2020:sqliteOpenConnection", op_open_connection);
  interface.register_op("tag:crabmusket.github.io,2020:sqliteExecute", op_execute);
  interface.register_op("tag:crabmusket.github.io,2020:sqliteQuery", op_query);
}

#[derive(Serialize, Deserialize)]
struct OpOpenConnectionParams {
  path: String,
}

#[derive(Serialize, Deserialize)]
struct OpOpenConnectionResponse {
  error: Option<String>,
  connection_id: Option<u32>,
}

pub fn op_open_connection(
  _interface: &mut dyn Interface,
  data: &[u8],
  _zero_copy: Option<ZeroCopyBuf>,
) -> Op {
  let params: OpOpenConnectionParams = serde_json::from_slice(data).unwrap();
  let mut connection_id = 0;
  CONNECTION_INDEX.with(|cell| {
    connection_id = cell.replace_with(|&mut i| i + 1);
  });
  let conn = Connection::open(params.path.clone()).unwrap();
  CONNECTION_MAP.with(|cell| {
    cell.borrow_mut().insert(connection_id, conn);
  });
  let response = OpOpenConnectionResponse {
    error: None,
    connection_id: Some(connection_id),
  };
  let result = serde_json::to_vec(&response).unwrap();
  Op::Sync(result.into_boxed_slice())
}

#[derive(Serialize, Deserialize)]
struct OpExecuteParams {
  connection_id: u32,
  statement: String,
  params: Vec<JsonValue>,
}

#[derive(Serialize, Deserialize)]
struct OpExecuteResponse {
  error: String,
  rows_affected: usize,
}

pub fn op_execute(
  _interface: &mut dyn Interface,
  data: &[u8],
  _zero_copy: Option<ZeroCopyBuf>,
) -> Op {
  let params: OpExecuteParams = serde_json::from_slice(data).unwrap();
  let mut rows_affected: Option<usize> = None;
  CONNECTION_MAP.with(|cell| {
    rows_affected = cell.borrow()
      .get(&params.connection_id)
      .map(|conn| {
        let mut stmt = conn.prepare_cached(&params.statement).unwrap();
        stmt.execute(json_to_params(params.params)).unwrap()
      });
  });
  let response = OpExecuteResponse {
    error: "".to_string(),
    rows_affected: rows_affected.unwrap(),
  };
  let result = serde_json::to_vec(&response).unwrap();
  Op::Sync(result.into_boxed_slice())
}

#[derive(Serialize, Deserialize)]
struct OpQueryParams {
  connection_id: u32,
  statement: String,
  params: Vec<JsonValue>,
}

#[derive(Serialize, Deserialize)]
struct OpQueryResponse {
  error: String,
  result: Vec<Vec<JsonValue>>,
}

pub fn op_query(
  _interface: &mut dyn Interface,
  data: &[u8],
  _zero_copy: Option<ZeroCopyBuf>,
) -> Op {
  let params: OpQueryParams = serde_json::from_slice(data).unwrap();
  let mut result_rows = Vec::new();
  CONNECTION_MAP.with(|cell| {
    cell.borrow()
      .get(&params.connection_id)
      .map(|conn| {
        let mut stmt = conn.prepare_cached(&params.statement).unwrap();
        let mut rows = stmt.query(json_to_params(params.params)).unwrap();
        while let Some(row) = rows.next().unwrap() {
          let mut result_row = Vec::new();
          for i in 0..row.column_count() {
            result_row.push(match row.get_raw(i) {
              ValueRef::Null => JsonValue::Null,
              ValueRef::Integer(i) => JsonValue::Number(serde_json::Number::from(i)),
              ValueRef::Real(r) => JsonValue::Number(serde_json::Number::from_f64(r).unwrap()),
              ValueRef::Text(t) => JsonValue::String(String::from_utf8_lossy(t).to_string()),
              ValueRef::Blob(b) => JsonValue::Array(vec![
                JsonValue::String("blob:base64".to_string()),
                JsonValue::String(base64::encode(b))
              ]),
            });
          }
          result_rows.push(result_row)
        }
      });
  });
  let response = OpQueryResponse {
    error: "".to_string(),
    result: result_rows,
  };
  let result = serde_json::to_vec(&response).unwrap();
  Op::Sync(result.into_boxed_slice())
}

fn json_to_params(params: Vec<JsonValue>) -> Vec<SqliteValue> {
  params.iter().map(|val| {
    match val {
      JsonValue::Null => SqliteValue::Null,
      JsonValue::Bool(b) => SqliteValue::Integer(if *b { 1 } else { 0 }),
      JsonValue::Number(n) => SqliteValue::Real(n.as_f64().unwrap()),
      JsonValue::String(s) => SqliteValue::Text(s.to_string()),
      // TODO: warn/error instead of silent NULL?
      JsonValue::Array(a) => parse_blob(&a).unwrap_or(SqliteValue::Null),
      // TODO: warn/error here?
      JsonValue::Object(_m) => SqliteValue::Null,
    }
  }).collect()
}

fn parse_blob(array: &Vec<JsonValue>) -> Option<SqliteValue> {
  match array.as_slice() {
    [JsonValue::String(s1), JsonValue::String(s2)] => if s1.eq("blob:base64") {
      base64::decode(s2).ok().map(|data| SqliteValue::Blob(data))
    } else {
      None
    }
    _ => None
  }
}
