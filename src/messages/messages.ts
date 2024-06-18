interface BeginOptions {
  radius: number;
  width: number;
  height: number;
}

interface Message {
  type: string;
  payload: unknown;
}

interface PoolMessage {
  jobId: number;
  content: unknown;
  workerCount: number;
  workerIdx: number;
}

function message(type: string, payload: unknown): Message {
  return {
    type,
    payload,
  };
}

export const create = {
  wrapper: {
    pool: (
      jobId: number,
      workerIdx: number,
      workerCount: number,
      content: unknown,
    ) => message("PoolMessage", { jobId, content, workerIdx, workerCount }),
  },
  message: {
    done: (status: boolean) => message("DoneMessage", { status }),
    beginSingle: (
      opts: BeginOptions,
      source: SharedArrayBuffer,
      destination: SharedArrayBuffer,
    ) => message("BeginSingleMessage", { ...opts, source, destination }),
    beginCoop: (
      opts: BeginOptions,
      source: SharedArrayBuffer,
      middle: SharedArrayBuffer,
      destination: SharedArrayBuffer,
    ) =>
      message("BeginMultipleMessage", { ...opts, source, middle, destination }),
    update: (chunk: number) => message("UpdateMessage", { chunk }),
  },
};

interface DoneMessage {
  status: boolean;
}

interface BeginSingleMessage extends BeginOptions {
  source: SharedArrayBuffer;
  destination: SharedArrayBuffer;
}

interface BeginMultipleMessage extends BeginOptions {
  source: SharedArrayBuffer;
  middle: SharedArrayBuffer;
  destination: SharedArrayBuffer;
}

interface UpdateMessage {
  chunk: number;
}

function isMessage(x: unknown): x is Message {
  return (
    x !== undefined &&
    x !== null &&
    typeof x === "object" &&
    "type" in x &&
    "payload" in x &&
    typeof x.type === "string" &&
    typeof x.payload === "object"
  );
}

function runIfType<T>(arg: unknown, t: string) {
  return (f: (x: T) => void) => {
    if (isMessage(arg) && arg.type === t) {
      f(arg.payload as T);
      return true;
    }
    return false;
  };
}

export const is = (x: unknown) => ({
  done: runIfType<DoneMessage>(x, "DoneMessage"),
  beginSingle: runIfType<BeginSingleMessage>(x, "BeginSingleMessage"),
  beginMultiple: runIfType<BeginMultipleMessage>(x, "BeginMultipleMessage"),
  pool: runIfType<PoolMessage>(x, "PoolMessage"),
  update: runIfType<UpdateMessage>(x, "UpdateMessage"),
});
