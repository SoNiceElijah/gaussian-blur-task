const workers: Worker[] = [];

function initWorkers() {
  const worker = new Worker(
    new URL("./workers/gaussianBlurWorker.ts", import.meta.url),
  );
  workers.push(worker);
}

function sendMemory(
  payload: [number, number, SharedArrayBuffer, SharedArrayBuffer],
  done: () => void,
) {
  for (const worker of workers) {
    worker.postMessage(payload);
    worker.onmessage = done;
  }
}

function addListeners() {
  const uploader = document.getElementById(
    "imageUploadInput",
  )! as HTMLInputElement;
  const originalImageCanvas = document.getElementById(
    "originalImage",
  )! as HTMLCanvasElement;
  const bluredImageCanvas = document.getElementById(
    "bluredImage",
  )! as HTMLCanvasElement;

  const originalContext = originalImageCanvas.getContext("2d");
  if (!originalContext) {
    return console.error("CRUSH");
  }

  const bluredContext = bluredImageCanvas.getContext("2d");
  if (!bluredContext) {
    return console.error("CRUSH");
  }

  uploader.onchange = () => {
    const { files } = uploader;

    if (files && files.length > 0) {
      const [file] = files;
      const url = URL.createObjectURL(file);

      const img = new Image();
      img.src = url;

      img.onload = () => {
        URL.revokeObjectURL(url);

        originalContext.clearRect(
          0,
          0,
          originalImageCanvas.width,
          originalImageCanvas.height,
        );

        let k = 1.0;
        if (img.width < img.height) {
          k = originalImageCanvas.height / img.height;
        } else {
          k = originalImageCanvas.width / img.width;
        }
        const w = Math.round(img.width * k);
        const h = Math.round(img.height * k);

        originalContext.drawImage(img, 0, 0, w, h);

        const imageData = originalContext.getImageData(0, 0, w, h);

        const sourceMemory = new SharedArrayBuffer(imageData.data.length);
        const destinationMemory = new SharedArrayBuffer(imageData.data.length);

        const ta = new Uint8ClampedArray(sourceMemory);
        ta.set(imageData.data);

        sendMemory([w, h, sourceMemory, destinationMemory], () => {
          const arr = new Uint8ClampedArray(destinationMemory.byteLength);
          arr.set(new Uint8ClampedArray(destinationMemory));

          console.log(destinationMemory.byteLength);
          const data = new ImageData(arr, w, h);

          console.log(data);

          bluredContext.clearRect(
            0,
            0,
            bluredImageCanvas.width,
            bluredImageCanvas.height,
          );
          bluredContext.putImageData(data, 0, 0);
        });
      };
    }
  };
}

function main() {
  initWorkers();
  addListeners();
}

window.onload = main;
