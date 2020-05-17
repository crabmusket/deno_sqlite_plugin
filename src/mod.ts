import { bufferToBase64 } from "./bufferToBase64.js";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export class Sqlite {
  _openConnection: number;
  _execute: number;
  _query: number;

  constructor() {
    let ops = (Deno as any).core.ops();
    let tag = "tag:crabmusket.github.io,2020";
    this._openConnection = ops[tag + ":sqliteOpenConnection"];
    this._execute = ops[tag + ":sqliteExecute"];
    this._query = ops[tag + ":sqliteQuery"];
    if (!this._openConnection || !this._execute || !this._query) {
      throw new Error("could not find ops");
    }
  }

  async connect(path: string): Promise<Connection> {
    let response = jsonSyncOp<OpenConnectionRequest, OpenConnectionResponse>(
      this._openConnection,
      { path },
    );
    if (response.error) {
      throw new Error("[ops.openConnection] error: " + response.error);
    }
    if (response.connection_id === null) {
      throw new Error(
        "[ops.openConnection] missing connection id with path: " + path,
      );
    }
    return new Connection(this, path, response.connection_id);
  }
}

export type Value = null | number | string | Blob;
export type Blob = ArrayBuffer;
export type Values = Array<Value>;

type EncodedValue = null | number | string | EncodedBlob;
type EncodedBlob = ["blob:base64", string];
type EncodedValues = Array<EncodedValue>;

export class Connection {
  _sqlite: Sqlite;
  _original_path: string;
  _connection_id: number;

  constructor(sqlite: Sqlite, path: string, id: number) {
    this._sqlite = sqlite;
    this._original_path = path;
    this._connection_id = id;
  }

  async execute(statement: string, params: Values = []): Promise<number> {
    let response = jsonSyncOp<ExecuteRequest, ExecuteResponse>(
      this._sqlite._execute,
      {
        connection_id: this._connection_id,
        statement,
        params: encodeBlobs(params),
      },
    );
    if (response.error) {
      throw new Error("[ops.execute] error: " + response.error);
    }
    return response.rows_affected;
  }

  async query(statement: string, params: Values = []): Promise<Values[]> {
    let response = jsonSyncOp<QueryRequest, QueryResponse>(
      this._sqlite._query,
      {
        connection_id: this._connection_id,
        statement,
        params: encodeBlobs(params),
      },
    );
    if (response.error) {
      throw new Error("[ops.execute] error: " + response.error);
    }
    return decodeBlobs(response.result);
  }
}

function encodeBlobs(params: Values): EncodedValues {
  return params.map((param) => {
    if (param instanceof ArrayBuffer) {
      return ["blob:base64", bufferToBase64(param)];
    }
    return param;
  });
}

function decodeBlobs(rows: EncodedValues[]): Values[] {
  return rows.map((row) => row.map(convertBlobs));

  function convertBlobs(col: EncodedValue): Value {
    if (col instanceof Array) {
      if (
        col.length === 2 &&
        col[0] === "blob:base64" &&
        typeof col[1] === "string"
      ) {
        return base64ToBuffer(col[1]);
      } else {
        throw new Error(
          "bad response from plugin; array which is not a blob",
        );
      }
    }
    return col;
  }
}

function base64ToBuffer(data: string): ArrayBuffer {
  let array = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
  return array.buffer;
}

type OpenConnectionRequest = {
  path: string;
};

type OpenConnectionResponse = {
  error: string | null;
  connection_id: number | null;
};

type ExecuteRequest = {
  connection_id: number;
  statement: string;
  params: EncodedValues;
};

type ExecuteResponse = {
  error: string;
  rows_affected: number;
};

type QueryRequest = {
  connection_id: number;
  statement: string;
  params: EncodedValues;
};

type QueryResponse = {
  error: string;
  result: EncodedValues[];
};

function jsonSyncOp<Req, Res>(op: number, request: Req): Res {
  let encodedRequest = encoder.encode(JSON.stringify(request));
  let rawResponse = (Deno as any).core.dispatch(op, encodedRequest);
  if (!rawResponse) {
    throw new Error("plugin op returned null");
  }
  let responseObject = JSON.parse(decoder.decode(rawResponse)) as Res;
  return responseObject;
}
