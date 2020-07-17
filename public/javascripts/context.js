var canvas = document.querySelector("#c");
var gl = canvas.getContext("webgl2", { preserveDrawingBuffer: true });
var ext = gl.getExtension('EXT_color_buffer_float');
if (!gl) {
  throw new Error('WebGL failed to initialize');
}
export { canvas, gl };