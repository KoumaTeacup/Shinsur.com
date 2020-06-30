var canvas = document.querySelector("#c");
const { mat4 } = require("gl-matrix");

var gl = canvas.getContext("webgl2");
if (!gl) {
  throw new Error('WebGL failed to initialize');
}

console.log("running webgl2");
// compose shader source
// var vertShaderSource = document.getElementById('default.vs').text;

var vertexShaderSource = require('../shaders/default.vs.js');
var fragmentShaderSource = require('../shaders/default.fs.js');

// create shader method
function createShader(gl, type, source) {
  var shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (success) {
    return shader;
  }
 
  console.log(gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
}

// actually create shader 
var vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
var fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

// create program method
function createProgram(gl, vertexShader, fragmentShader) {
  var program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  var success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (success) {
    return program;
  }
 
  console.log(gl.getProgramInfoLog(program));
  gl.deleteProgram(program);
}

// actually create program
var program = createProgram(gl, vertexShader, fragmentShader);

// attribute
var positionAttributeLocation = gl.getAttribLocation(program, "a_position");
var offsetloc = gl.getUniformLocation(program, "u_offset");
var matModelLoc = gl.getUniformLocation(program, "u_matModel");
var matViewLoc = gl.getUniformLocation(program, "u_matView");
var matProjLoc = gl.getUniformLocation(program, "u_matProj");

// Use program to set uniform
gl.useProgram(program);

// create & bind & intialize position buffer
var positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

// fill data
var positions = [
  -0.5, -0.5, 0.5, // left bottom front
  -0.5, 0.5, 0.5, // left top front
  0.5, -0.5, 0.5, // right bottom front
  0.5, 0.5, 0.5, // right top front
  -0.5, -0.5, -0.5, // left bottom back
  -0.5, 0.5, -0.5, // left top back
  0.5, -0.5, -0.5, // right bottom back
  0.5, 0.5, -0.5, // right top back
];

gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

// create & bind & initialize index buffer
var ibo = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);

var indicies = [
  0,1,2, 2,1,3, // front
  1,5,3, 3,5,7, // top
  5,4,7, 7,4,6, // back
  4,0,6, 6,0,2, // bottom
  2,3,6, 6,3,7, // right
  4,5,0, 0,5,1  // left
];

gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indicies), gl.STATIC_DRAW);


// vao
var vao = gl.createVertexArray();
gl.bindVertexArray(vao);
gl.enableVertexAttribArray(positionAttributeLocation);

gl.vertexAttribPointer(
  positionAttributeLocation,
  3, // size, components per iteration
  gl.FLOAT, // data type
  false, // normalize
  0, // stride
  0) // offset

// viewport
//webglUtils.resizeCanvasToDisplaySize(gl.canvas);
gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

// Clear the canvas
gl.clearColor(1, 0, 0, 1);
gl.clear(gl.COLOR_BUFFER_BIT);

gl.enable(gl.CULL_FACE);
gl.cullFace(gl.BACK);

function draw(timestamp)
{
  // Clear the canvas
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Bind vao
  // gl.bindVertexArray(vao);

  // bind ibo
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);

  // bind shader program
  gl.useProgram(program);
  gl.uniform2fv(offsetloc, [-1.0 * Math.sin(timestamp/1000), -0.1]);
  gl.uniformMatrix4fv(matModelLoc, false, mat4.fromRotation([], timestamp/1000, [1.0, 2.0, 1.0]));
  gl.uniformMatrix4fv(matViewLoc, false, mat4.lookAt(
    [],
    [0.0, 0.0, -2.0], // position Math.sin(timestamp/1000)
    [0.0, 0.0, 0.0], // target
    [0.0, 1.0, 0.0]  // up
    ));
  gl.uniformMatrix4fv(matProjLoc, false, mat4.perspective(
    [],
    1.7, //fov
    gl.canvas.width / gl.canvas.height,
    0.001, // near plane
    1000 // far plane
  ));

  // actual draw call
  var primitiveType = gl.LINE_STRIP;
  var offset = 0;
  var count = 3;
  // gl.drawArrays(primitiveType, offset, count);
  gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);

  // request next frame
  window.requestAnimationFrame(draw);
}

window.requestAnimationFrame(draw);