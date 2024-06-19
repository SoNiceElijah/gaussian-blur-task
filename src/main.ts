import "./style.css";

import { create } from "./messages/messages";
import { WorkerPool } from "./pool";

function panic(msg?: string): never {
  alert(msg ?? "CRUSHED");
  throw new Error(msg ?? "CRUSH");
}

interface UIElements {
  beginButton: HTMLButtonElement;
  uploadInput: HTMLInputElement;
  uploadButton: HTMLElement;
  urlButton: HTMLButtonElement;
  loadBar: HTMLElement;
  radiusInput: HTMLInputElement;
  originalCanvas: HTMLCanvasElement;
  blurredCanvas: HTMLCanvasElement;
}

interface DrawContext {
  original: CanvasRenderingContext2D;
  blurred: CanvasRenderingContext2D;
}

interface AppState {
  imageUploading: boolean;
  hasUploadedImage: boolean;
}

interface Context {
  elements: UIElements;
  context: DrawContext;
  state: AppState;
  pool: WorkerPool;
}

function upload(context: Context, url: string) {
  const img = new Image();

  // so we can process any image
  // maybe better remove this
  img.crossOrigin = "";

  img.src = url;

  context.state.imageUploading = true;

  img.onload = () => {
    URL.revokeObjectURL(url);

    const canvas = context.elements.originalCanvas;

    canvas.width = img.width;
    canvas.height = img.height;

    context.context.original.clearRect(0, 0, canvas.width, canvas.height);

    context.context.original.drawImage(img, 0, 0, img.width, img.height);
    context.state.hasUploadedImage = true;
    context.elements.beginButton.disabled = false;
    context.state.imageUploading = false;

    context.context.blurred.clearRect(
      0,
      0,
      context.elements.blurredCanvas.width,
      context.elements.blurredCanvas.height,
    );

    context.elements.blurredCanvas.width = img.width;
    context.elements.blurredCanvas.height = img.height;
  };

  img.onerror = (e) => {
    context.state.imageUploading = false;
    console.error(e);
  };
}

function watchUpload(context: Context) {
  context.elements.uploadInput.addEventListener("change", () => {
    const { files } = context.elements.uploadInput;
    if (files && files.length > 0) {
      const [file] = files;
      const url = URL.createObjectURL(file);

      upload(context, url);
    }
  });

  context.elements.urlButton.addEventListener("click", () => {
    const answer = prompt("Enter url");
    if (answer !== null) {
      upload(context, answer);
    }
  });
}

function watchStart(context: Context) {
  context.elements.beginButton.addEventListener("click", async () => {
    if (!context.state.hasUploadedImage && context.state.imageUploading) {
      alert("Image uploading...");
      return;
    }

    if (!context.state.hasUploadedImage) {
      alert("No uploaded image!");
      return;
    }

    const radiusText = context.elements.radiusInput.value;
    const radius = parseInt(radiusText);
    if (Number.isNaN(radius)) {
      alert(`Radius can not be "${radiusText}"`);
      return;
    }

    if (radius <= 1 || radius >= 10000) {
      alert(`Radius out of bounds [1:${10000}]`);
      return;
    }

    const w = context.elements.originalCanvas.width;
    const h = context.elements.originalCanvas.height;

    const imageData = context.context.original.getImageData(0, 0, w, h);

    const sourceMemory = new SharedArrayBuffer(imageData.data.length);
    const destinationMemory = new SharedArrayBuffer(imageData.data.length);

    const array = new Uint8ClampedArray(sourceMemory);
    array.set(imageData.data);

    const middleSource = new SharedArrayBuffer(imageData.data.length + 8);

    const startTime = Date.now();
    console.log("RUNNING");
    let statusSum = 0;
    const workSize = 2 * w * h;

    context.elements.beginButton.disabled = true;
    context.elements.uploadInput.disabled = true;
    context.elements.urlButton.disabled = true;
    context.elements.loadBar.style.width = "0";
    context.elements.loadBar.style.opacity = "1.0";

    context.pool
      .submit(
        create.message.beginCoop(
          {
            radius,
            width: w,
            height: h,
          },
          sourceMemory,
          middleSource,
          destinationMemory,
        ),
        (chunk) => {
          statusSum += chunk;
          const wd = Math.round((100 * statusSum) / workSize);
          context.elements.loadBar.style.width = `${wd}%`;
        },
      )
      .then((status) => {
        const finalTime = Date.now();
        console.log("TIME:", finalTime - startTime);

        if (!status) {
          panic("Can not blur!");
        }

        const arr = new Uint8ClampedArray(destinationMemory.byteLength);
        arr.set(new Uint8ClampedArray(destinationMemory));

        const original = context.elements.originalCanvas;
        const data = new ImageData(arr, original.width, original.height);

        const blurred = context.elements.blurredCanvas;
        blurred.width = w;
        blurred.height = h;

        context.context.blurred.clearRect(0, 0, blurred.width, blurred.height);
        context.context.blurred.putImageData(data, 0, 0);
      })
      .catch(() => {
        panic("Pool is unavailable!");
      })
      .finally(() => {
        context.elements.beginButton.disabled = false;
        context.elements.uploadInput.disabled = false;
        context.elements.urlButton.disabled = false;
        context.elements.loadBar.style.opacity = "0.0";
      });
  });
}

function main() {
  const uploadInput = document.getElementById(
    "imageUploadInput",
  )! as HTMLInputElement;
  const originalCanvas = document.getElementById(
    "originalImage",
  )! as HTMLCanvasElement;
  const blurredCanvas = document.getElementById(
    "blurredImage",
  )! as HTMLCanvasElement;
  const beginButton = document.getElementById(
    "blurButton",
  )! as HTMLButtonElement;
  const loadBar = document.getElementById("loadingBar")!;
  const radiusInput = document.getElementById(
    "radiusInput",
  )! as HTMLInputElement;
  const uploadButton = document.getElementById(
    "uploadButton",
  )! as HTMLLabelElement;
  const urlButton = document.getElementById("urlButton")! as HTMLButtonElement;

  const original = originalCanvas.getContext("2d");
  if (!original) {
    panic("Can not create canvas context!");
  }

  const blurred = blurredCanvas.getContext("2d");
  if (!blurred) {
    panic("Can not create canvas context!");
  }

  const context: Context = {
    elements: {
      beginButton,
      uploadInput,
      uploadButton,
      loadBar,
      radiusInput,
      originalCanvas,
      blurredCanvas,
      urlButton,
    },
    context: {
      original,
      blurred,
    },
    pool: new WorkerPool(),
    state: {
      hasUploadedImage: false,
      imageUploading: false,
    },
  };

  watchUpload(context);
  watchStart(context);
}

window.onload = main;
