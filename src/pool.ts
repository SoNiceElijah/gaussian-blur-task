import { create, is } from "./messages/messages";

interface Job {
  id: number;
  workersInProgress: number;
  resolve: (x: boolean | PromiseLike<boolean>) => void;
  reject: () => void;
  update?: (chunk: number) => void;
}

export class WorkerPool {
  private static jobId = 0;
  private workers: Worker[] = [];
  private jobs: Job[] = [];

  private cleanups: (() => void)[] = [];

  constructor(instance: string, size?: number) {
    this.init(instance, size);
  }

  private init(instance: string, size?: number) {
    const n = size === undefined ? navigator.hardwareConcurrency - 1 : size;

    for (let i = 0; i < n; ++i) {
      this.workers.push(
        new Worker(new URL(instance, import.meta.url), {
          type: "module",
        }),
      );
    }

    for (const w of this.workers) {
      const handler = (msg: MessageEvent) => {
        is(msg.data).pool((x) => {
          is(x.content).done((e) => {
            const recordIdx = this.jobs.findIndex((j) => j.id === x.jobId);
            const record = this.jobs[recordIdx];
            if (e.status && record) {
              --record.workersInProgress;
              if (record.workersInProgress <= 0) {
                record.resolve(true);
                this.jobs.splice(recordIdx, 1);
              }
            }
          });
          is(x.content).update((e) => {
            const record = this.jobs.find((j) => j.id === x.jobId);
            if (record) {
              record.update?.(e.chunk);
            }
          });
        });
      };

      w.addEventListener("message", handler);
      this.cleanups.push(() => w.removeEventListener("message", handler));
    }
  }

  submit(msg: unknown, update?: (chunk: number) => void): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const id = WorkerPool.jobId++;
      this.jobs.push({
        id,
        workersInProgress: this.workers.length,
        resolve,
        reject,
        update,
      });
      let i = 0;
      for (const w of this.workers) {
        w.postMessage(create.wrapper.pool(id, i, this.workers.length, msg));
        ++i;
      }
    });
  }

  switch(instance: string, size?: number) {
    this.destroy();
    this.init(instance, size);
  }

  destroy() {
    for (const j of this.jobs) {
      j.reject();
    }
    for (const w of this.workers) {
      w.terminate();
    }
    for (const cleanup of this.cleanups) {
      cleanup();
    }

    this.cleanups = [];
  }
}
