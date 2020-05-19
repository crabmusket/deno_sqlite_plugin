import { bufferToBase64 } from "./_buffer_to_base64.js";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * This class is intended to be a holder for configuration. At the moment though,
 * there is no configuration! It's just a factory for Connections.
 *
 * This class does store the IDs of the internal ops used by the library, but
 * that may change in the future. I'm leaving this class as part of the API for
 * now, but it may be removed at some point if it doesn't become useful. This
 * may depend on how Deno's plugin API evolves.
 */
export class Sqlite {
  /** @ignore */
  _openConnection: number;

  /** @ignore */
  _execute: number;

  /** @ignore */
  _query: number;

  /** No need to pass any arguments yet. */
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

  /**
   * Open a connection to a database file. Supports the string ":memory:" for
   * creating temporary in-memory databases. There is no way to save in-memory
   * databases beyond the lifetime of the process.
   *
   * @param path Path (relative to the current working dir) to the database file.
   * @throws {Error} If the database cannot be opened, an exception will be thrown.
   */
  async connect(path: string): Promise<Connection> {
    let response = jsonSyncOp<OpenConnectionRequest, OpenConnectionResponse>(
      this._openConnection,
      { path },
    );
    if (response.error) {
      throw new Error(response.error);
    }
    if (response.connection_id === null) {
      throw new Error(
        "missing connection id when opening: " + path,
      );
    }
    return new Connection(this, path, response.connection_id);
  }
}

/**
 * SQLite knows only a few native types, represented here. All other types (dates,
 * booleans, etc.) must be encoded as one of these types.
 * https://www.sqlite.org/datatype3.html
 */
export type Value = null | number | string | Blob;

export type Values = Array<Value>;

/**
 * Raw ArrayBuffers are used to transfer binary data. For example, if you have
 * a typed array like a Uint8Array, you can use `theArray.buffer` to get its
 * raw data for insertion into SQLite.
 */
export type Blob = ArrayBuffer;

type EncodedValue = null | number | string | EncodedBlob;
type EncodedBlob = ["blob:base64", string];
type EncodedValues = Array<EncodedValue>;

/** Represents an open database. */
export class Connection {
  /** @ignore */
  _sqlite: Sqlite;
  /** @ignore */
  _original_path: string;
  /** @ignore */
  _connection_id: number;

  /** @ignore */
  constructor(sqlite: Sqlite, path: string, id: number) {
    this._sqlite = sqlite;
    this._original_path = path;
    this._connection_id = id;
  }

  /**
   * Run a sqlite statement. Use ? in the statement string as a placeholder and
   * pass the values in the second argument.
   *
   * @return The number of rows affected by the statement.
   * @throws {Error} Errors will have a hopefully-helpful message.
   */
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
      throw new Error(response.error);
    }
    return response.rows_affected;
  }

  /**
   * Perform a query to get data out.
   *
   * @return List of resulting rows that mathed the query. Note this is an array
   *         of arrays.
   * @throws {Error} Throws if anything goes wrong.
   */
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
      throw new Error(response.error);
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
