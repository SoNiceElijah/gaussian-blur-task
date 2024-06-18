import { createGaussian } from "../math/gaussian";
import { create, is } from "../messages/messages";
import { receive } from "./worker";

const FLAGS_OFFSET = 8;

function coopBlur(
  idx: number,
  count: number,
  radius: number,
  w: number,
  h: number,
  source: Uint8ClampedArray,
  middle: Uint8ClampedArray,
  flags: Int32Array,
  destination: Uint8ClampedArray,
  update: (chunk: number) => void,
) {
  const kernel = [];
  const sigma = Math.max(radius / 2, 1);
  const gaussian = createGaussian(sigma);
  for (let i = -radius; i <= radius; ++i) {
    kernel.push(gaussian(i));
  }

  for (let y = idx; y < h; y += count) {
    for (let x = 0; x < w; ++x) {
      for (let c = 0; c < 4; ++c) {
        const dest = 4 * w * y + 4 * x + c;
        let sum = 0;

        for (let i = -radius; i <= radius; ++i) {
          const dx = x + i;
          if (dx < 0 || dx >= w) {
            continue;
          }
          const idx = dest + 4 * i;
          sum +=
            idx > 0 && idx < source.length
              ? source[idx] * kernel[i + radius]
              : 0;
        }

        middle[dest + FLAGS_OFFSET] = sum;
      }
    }
    update(w);
  }

  const original = Atomics.add(flags, 1, 1);
  if (original === count - 1) {
    Atomics.store(flags, 0, 1);
    Atomics.notify(flags, 0);
  }
  while (Atomics.wait(flags, 0, 0) !== "not-equal");

  for (let x = idx; x < w; x += count) {
    for (let y = 0; y < h; ++y) {
      for (let c = 0; c < 4; ++c) {
        const dest = 4 * w * y + 4 * x + c;
        let sum = 0;
        for (let i = -radius; i <= radius; ++i) {
          const dy = y + i;
          if (dy < 0 || dy > h) {
            continue;
          }
          const idx = dest + 4 * w * i;
          sum +=
            idx > 0 && idx < middle.length
              ? middle[idx + FLAGS_OFFSET] * kernel[i + radius]
              : 0;
        }
        destination[dest] = sum;
      }
    }
    update(h);
  }
}

onmessage = receive(({ send, data, info }) => {
  const found = is(data).beginMultiple((description) => {
    coopBlur(
      info.workerIdx,
      info.workerCount,
      description.radius,
      description.width,
      description.height,
      new Uint8ClampedArray(description.source),
      new Uint8ClampedArray(description.middle),
      new Int32Array(description.middle),
      new Uint8ClampedArray(description.destination),
      (chunk) => send(create.message.update(chunk)),
    );
    send(create.message.done(true));
  });
  if (!found) {
    send(create.message.done(false));
  }
});
