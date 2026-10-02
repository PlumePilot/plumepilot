// Export-scoped: hold only metadata here. JSZip owns unique encoded buffers.
export function createImageAssetRegistry(zip, signal, diagnostics) {
  const byHash = new Map();
  const images = [];
  const stats = { inputImageCount: 0, uniqueImageCount: 0, reusedImageCount: 0,
    inputImageBytes: 0, storedImageBytes: 0, reusedImageBytes: 0 };
  if (diagnostics) diagnostics.assets = stats;
  const checkAbort = () => {
    if (signal?.aborted) throw new DOMException("Creazione EPUB annullata.", "AbortError");
  };
  return {
    images,
    async register(image) {
      checkAbort();
      const extension = image.name.split(".").at(-1);
      const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", image.bytes));
      checkAbort();
      const hash = Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
      const key = `${image.mediaType}:${extension}:${hash}`;
      stats.inputImageCount++;
      stats.inputImageBytes += image.bytes.byteLength;
      let asset = byHash.get(key);
      if (asset) {
        stats.reusedImageCount++;
        stats.reusedImageBytes += image.bytes.byteLength;
      } else {
        asset = { name: image.name, mediaType: image.mediaType, size: image.bytes.byteLength };
        byHash.set(key, asset);
        images.push(asset);
        zip.file(`OEBPS/${asset.name}`, image.bytes, { compression: "STORE" });
        stats.uniqueImageCount++;
        stats.storedImageBytes += image.bytes.byteLength;
      }
      return asset;
    },
  };
}
