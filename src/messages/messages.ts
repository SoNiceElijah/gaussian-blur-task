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
}

function message(type: string, payload: unknown): Message {
  return {
    type,
    payload,
  };
}

export const create = {
  wrapper: {
    pool: (jobId: number, content: unknown) =>
      message("PoolMessage", { jobId, content }),
  },
  message: {
    done: (status: boolean) => message("DoneMessage", { status }),
    begin: (
      opts: BeginOptions,
      source: SharedArrayBuffer,
      destination: SharedArrayBuffer,
    ) => message("BeginMessage", { ...opts, source, destination }),
  },
};

interface DoneMessage {
  status: boolean;
}

interface BeginMessage extends BeginOptions {
  source: SharedArrayBuffer;
  destination: SharedArrayBuffer;
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
  begin: runIfType<BeginMessage>(x, "BeginMessage"),
  pool: runIfType<PoolMessage>(x, "PoolMessage"),
});
