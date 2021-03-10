var canvas = document.querySelector("#mainCanvas");
var gl = canvas.getContext("webgl2", { preserveDrawingBuffer: true });
var EXT_color_buffer_float = gl.getExtension('EXT_color_buffer_float');
var OES_texture_float_linear = gl.getExtension('OES_texture_float_linear');
if (!OES_texture_float_linear || !EXT_color_buffer_float) {
  alert('missing WebGL extension support, please use the latest browser!');
}
if (!gl) {
  throw new Error('WebGL failed to initialize');
}
export { canvas, gl };