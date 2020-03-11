import { bufferToBase64 } from "./bufferToBase64.js";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export async function init(filename: string): Promise<Sqlite> {
  let plugin = Deno.openPlugin(filename);
  return new Sqlite(plugin);
}

export class Sqlite {
  _plugin: Deno.Plugin;

  constructor(plugin: Deno.Plugin) {
    this._plugin = plugin;
  }

  async connect(path: string): Promise<Connection> {
    let response = jsonSyncOp<OpenConnectionRequest, OpenConnectionResponse>(
      this._plugin.ops.openConnection,
      {path}
    );
    if (response.error) {
      throw new Error("[ops.openConnection] error: " + response.error);
    }
    if (!response.result) {
      throw new Error("[ops.openConnection] missing result with path: " + path);
    }
    return new Connection(this._plugin, path, response.result.connection_id);
  }
}

export type Params = Array<null | number | string | Blob>;
export type Blob = ArrayBuffer;

export type EncodedParams = Array<null | number | string | EncodedBlob>;
export type EncodedBlob = ['blob:base64', string];

export class Connection {
  _plugin: Deno.Plugin;
  _original_path: string;
  _connection_id: number;

  constructor(plugin, path, id) {
    this._plugin = plugin;
    this._original_path = path;
    this._connection_id = id;
  }

  async execute(statement: string, params: Params = []): Promise<number> {
    let response = jsonSyncOp<ExecuteRequest, ExecuteResponse>(
      this._plugin.ops.execute,
      {
        connection_id: this._connection_id,
        statement,
        params: encodeBlobs(params),
      }
    );
    if (response.error) {
      throw new Error("[ops.execute] error: " + response.error);
    }
    return response.rows_affected;
  }

  async query(statement: string, params: Params = []): Promise<any> {
    let response = jsonSyncOp<QueryRequest, QueryResponse>(
      this._plugin.ops.query,
      {
        connection_id: this._connection_id,
        statement,
        params: encodeBlobs(params),
      }
    );
    if (response.error) {
      throw new Error("[ops.execute] error: " + response.error);
    }
    return decodeBlobs(response.result);
  }
}

function encodeBlobs(params: Params): EncodedParams {
  return params.map(param => {
    if (param instanceof ArrayBuffer) {
      return ['blob:base64', bufferToBase64(param)];
    }
    return param;
  })
}

function decodeBlobs(result: any[][]): any[][] {
  for (let row of result) {
    for (let i in row) {
      let col = row[i];
      if (col instanceof Array) {
        if (col.length === 2
          && col[0] === 'blob:base64'
          && typeof col[1] === 'string') {
          row[i] = base64ToBuffer(col[1]);
        } else {
          throw new Error(
            "bad response from plugin; array which is not a blob"
          );
        }
      }
    }
  }
  return result;
}

function base64ToBuffer(data: string): ArrayBuffer {
  let array = Uint8Array.from(atob(data), c => c.charCodeAt(0));
  return array.buffer;
}

type OpenConnectionRequest = {
  path: string;
};

type OpenConnectionResponse = {
  error: string | null;
  result: null | {
    connection_id: number;
  };
};

type ExecuteRequest = {
  connection_id: number;
  statement: string;
  params: EncodedParams;
};

type ExecuteResponse = {
  error: string;
  rows_affected: number;
};

type QueryRequest = {
  connection_id: number;
  statement: string;
  params: EncodedParams;
};

type QueryResponse = {
  error: string;
  result: any[][];
};

function jsonSyncOp<Req, Res>(op: Deno.PluginOp, request: Req): Res {
  let encodedRequest = encoder.encode(JSON.stringify(request));
  let rawResponse = op.dispatch(encodedRequest);
  let responseObject = JSON.parse(decoder.decode(rawResponse)) as Res;
  return responseObject;
}
