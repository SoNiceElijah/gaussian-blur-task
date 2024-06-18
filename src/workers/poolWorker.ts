import { create, is } from "../messages/messages";

interface Context {
  send: (x: unknown) => void;
  data: unknown;
  info: {
    workerCount: number;
    workerIdx: number;
  };
}

type Handler = (x: Context) => void;

export function receive(f: Handler) {
  return (e: MessageEvent) => {
    is(e.data).pool((x) => {
      f({
        send: (y) => {
          postMessage(
            create.wrapper.pool(x.jobId, x.workerIdx, x.workerCount, y),
          );
        },
        data: x.content,
        info: {
          workerCount: x.workerCount,
          workerIdx: x.workerIdx,
        },
      });
    });
  };
}
