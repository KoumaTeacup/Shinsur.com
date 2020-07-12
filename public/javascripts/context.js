var canvas = document.querySelector("#c");
var gl = canvas.getContext("webgl2", { preserveDrawingBuffer: true });
if (!gl) {
  throw new Error('WebGL failed to initialize');
}

export { canvas, gl };