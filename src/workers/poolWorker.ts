import { create, is } from "../messages/messages";

interface Context {
  send: (x: unknown) => void;
  data: unknown;
}

type Handler = (x: Context) => void;

export function receive(f: Handler) {
  return (e: MessageEvent) => {
    is(e.data).pool((x) => {
      f({
        send: (y) => {
          postMessage(create.wrapper.pool(x.jobId, y));
        },
        data: x.content,
      });
    });
  };
}
