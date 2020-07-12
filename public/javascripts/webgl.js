import { Program } from './shader.js';
import * as vec3 from './gl-matrix/vec3.js';
import { gl } from './context.js';
import { Mesh } from './mesh.js';
import { FocusCamera } from './camera.js';

var defaultProg = new Program('default');
var mesh = new Mesh('floor');
var camera = new FocusCamera();
camera.viewAngle = vec3.fromValues(0.0, 1.0, 1.0);
camera.distance = 20.0;

// viewport
//webglUtils.resizeCanvasToDisplaySize(gl.canvas);
gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

// enable back face culling
gl.enable(gl.CULL_FACE);
gl.cullFace(gl.BACK);

gl.enable(gl.DEPTH_TEST);
gl.depthFunc(gl.LESS);

function draw(timestamp) {

  // Clear the canvas
  gl.clearColor(0, 0, 0, 1);
  gl.clearDepth(1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // update light
  defaultProg.use();
  defaultProg.bindUniform3fv('LightPos', [3.0, 3.0, 3.0]);

  camera.update();
  
  mesh.draw();

  // request next frame
  window.requestAnimationFrame(draw);
}

window.requestAnimationFrame(draw);