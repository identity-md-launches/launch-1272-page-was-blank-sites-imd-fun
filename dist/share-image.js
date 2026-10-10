/**
 * Decode our canvas PNG locally. Fetching a data: URL would require data: in
 * connect-src, even though the image has already been generated in this page.
 * @param {string} url A PNG data URL returned by canvas.toDataURL("image/png").
 * @returns {Blob}
 */
function shareImageBlob(url) {
  const prefix = "data:image/png;base64,";
  if (!url.startsWith(prefix)) throw new TypeError("Expected a PNG data URL");
  const binary = atob(url.slice(prefix.length));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new Blob([bytes], { type: "image/png" });
}
