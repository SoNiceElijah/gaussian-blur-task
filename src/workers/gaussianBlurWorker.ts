function gaussian(K: number, sigma2: number, x: number) {
  return K * Math.exp(-(x * x) / (2 * sigma2));
}

function gaussianBlur(
  radius: number,
  w: number,
  h: number,
  source: Uint8ClampedArray,
  destination: Uint8ClampedArray,
) {
  const kernel = [];
  const sigma = Math.max(radius / 2, 1);
  const sigma2 = sigma * sigma;
  const K = 1 / Math.sqrt(2 * Math.PI * sigma * sigma);
  for (let i = -radius; i <= radius; ++i) {
    kernel.push(gaussian(K, sigma2, i));
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

onmessage = (msg) => {
  const [w, h, src, dst] = msg.data as [
    number,
    number,
    SharedArrayBuffer,
    SharedArrayBuffer,
  ];
  gaussianBlur(
    200,
    w,
    h,
    new Uint8ClampedArray(src),
    new Uint8ClampedArray(dst),
  );
  postMessage("DONE!");
};
