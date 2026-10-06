let workerPromise = null;

export async function ocrImage(source) {
  const Tesseract = (await import("../vendor/tesseract.esm.min.js")).default;
  if (!workerPromise) {
    workerPromise = Tesseract.createWorker("eng", 1, {
      workerPath: new URL("../vendor/tesseract-worker.min.js", import.meta.url).href,
      corePath: new URL("../vendor/tesseract-core-simd-lstm.wasm.js", import.meta.url).href,
      langPath: new URL("../vendor", import.meta.url).href.replace(/\/$/, ""),
      workerBlobURL: false,
      gzip: true,
    });
  }
  const worker = await workerPromise;
  const result = await worker.recognize(source);
  return result.data.text || "";
}
