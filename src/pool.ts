import { create, is } from "./messages/messages";

interface Job {
  id: number;
  workersInProgress: number;
  resolve: (x: boolean | PromiseLike<boolean>) => void;
}

export class WorkerPool {
  private static jobId = 0;
  private workers: Worker[] = [];
  private jobs: Job[] = [];

  constructor(instance: string, size?: number) {
    const n = size === undefined ? navigator.hardwareConcurrency - 1 : size;

    for (let i = 0; i < n; ++i) {
      this.workers.push(
        new Worker(new URL(instance, import.meta.url), {
          type: "module",
        }),
      );
    }

    for (const w of this.workers) {
      w.addEventListener("message", (msg) => {
        is(msg.data).pool((x) => {
          is(x.content).done((e) => {
            const record = this.jobs.find((j) => j.id === x.jobId);
            if (e.status && record) {
              --record.workersInProgress;
              if (record.workersInProgress <= 0) {
                record.resolve(true);
              }
            }
          });
        });
      });
    }
  }

  submit(msg: unknown): Promise<boolean> {
    return new Promise((resolve) => {
      const id = WorkerPool.jobId++;
      this.jobs.push({
        id,
        workersInProgress: this.workers.length,
        resolve,
      });
      let i = 0;
      for (const w of this.workers) {
        w.postMessage(create.wrapper.pool(id, i, this.workers.length, msg));
        ++i;
      }
    });
  }
}
