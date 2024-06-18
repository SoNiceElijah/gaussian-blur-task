import { create } from "./messages/messages";
import { WorkerPool } from "./pool";

function panic(msg?: string): never {
  alert("CRUSHED");
  throw new Error(msg ?? "CRUSH");
}

const pool = new WorkerPool("./workers/gaussianBlurWorker.ts", 1);
let imageUploading = false;
let hasUploadedImage = false;

function watchUpload(input: HTMLInputElement, canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d");
  if (!context) {
    panic("Can not create canvas context!");
  }

  input.addEventListener("change", () => {
    const { files } = input;
    if (files && files.length > 0) {
      const [file] = files;
      const url = URL.createObjectURL(file);

      const img = new Image();
      img.src = url;

      imageUploading = true;

      img.onload = () => {
        URL.revokeObjectURL(url);

        canvas.width = img.width;
        canvas.height = img.height;

        context.clearRect(0, 0, canvas.width, canvas.height);

        context.drawImage(img, 0, 0, img.width, img.height);
        hasUploadedImage = true;
        imageUploading = false;
      };

      img.onerror = () => {
        imageUploading = false;
      };
    }
  });
}

function watchStart(
  button: HTMLButtonElement,
  original: HTMLCanvasElement,
  blurred: HTMLCanvasElement,
) {
  const originalContext = original.getContext("2d");
  const blurredContext = blurred.getContext("2d");

  if (!originalContext) {
    panic("Can not create canvas context!");
  }
  if (!blurredContext) {
    panic("Can not create canvas context!");
  }

  button.addEventListener("click", async () => {
    if (!hasUploadedImage && imageUploading) {
      alert("Image uploading...");
      return;
    }

    if (!hasUploadedImage) {
      alert("No uploaded image!");
      return;
    }

    const w = original.width;
    const h = original.height;

    const imageData = originalContext.getImageData(0, 0, w, h);

    const sourceMemory = new SharedArrayBuffer(imageData.data.length);
    const destinationMemory = new SharedArrayBuffer(imageData.data.length);

    const array = new Uint8ClampedArray(sourceMemory);
    array.set(imageData.data);

    const status = await pool.submit(
      create.message.begin(
        {
          radius: 5,
          width: w,
          height: h,
        },
        sourceMemory,
        destinationMemory,
      ),
    );

    if (!status) {
      panic("Can not blur!");
    }

    const arr = new Uint8ClampedArray(destinationMemory.byteLength);
    arr.set(new Uint8ClampedArray(destinationMemory));

    const data = new ImageData(arr, original.width, original.height);

    blurred.width = w;
    blurred.height = h;

    blurredContext.clearRect(0, 0, blurred.width, blurred.height);

    blurredContext.putImageData(data, 0, 0);
  });
}

function main() {
  const uploader = document.getElementById(
    "imageUploadInput",
  )! as HTMLInputElement;
  const originalImageCanvas = document.getElementById(
    "originalImage",
  )! as HTMLCanvasElement;
  const blurredImageCanvas = document.getElementById(
    "blurredImage",
  )! as HTMLCanvasElement;
  const startButton = document.getElementById(
    "blurButton",
  )! as HTMLButtonElement;

  watchUpload(uploader, originalImageCanvas);
  watchStart(startButton, originalImageCanvas, blurredImageCanvas);
}

window.onload = main;
