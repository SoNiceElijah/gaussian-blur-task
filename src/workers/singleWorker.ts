import { createGaussian } from "../math/gaussian";
import { create, is } from "../messages/messages";
import { receive } from "./poolWorker";

function naiveBlur(
  radius: number,
  w: number,
  h: number,
  source: Uint8ClampedArray,
  destination: Uint8ClampedArray,
) {
  const kernel = [];
  const sigma = Math.max(radius / 2, 1);
  const gaussian = createGaussian(sigma);
  for (let i = -radius; i <= radius; ++i) {
    kernel.push(gaussian(i));
  }

  const middle = new Uint8ClampedArray(source.length);

  for (let y = 0; y < h; ++y) {
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

        middle[dest] = sum;
      }
    }
  }

  for (let x = 0; x < w; ++x) {
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
              ? middle[idx] * kernel[i + radius]
              : 0;
        }
        destination[dest] = sum;
      }
    }
  }
}

onmessage = receive(({ send, data, info }) => {
  if (info.workerIdx !== 0) {
    return send(create.message.done(true));
  }
  const found = is(data).begin((description) => {
    naiveBlur(
      description.radius,
      description.width,
      description.height,
      new Uint8ClampedArray(description.source),
      new Uint8ClampedArray(description.destination),
    );
    send(create.message.done(true));
  });
  if (!found) {
    send(create.message.done(false));
  }
});
