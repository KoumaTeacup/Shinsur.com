import { Program } from './shader.js';
import * as vec3 from './gl-matrix/vec3.js';
import { gl } from './context.js';
import { Mesh, RenderPlane } from './mesh.js';
import { FocusCamera } from './camera.js';
import { PointLight } from './pointLight.js';
import { Viewport } from './viewport.js';
import { Utility } from './htmlUtil.js';

// Contructor needed, don't delete
//var htmlUtil = new Utility();
var util = new Utility();
var viewport = new Viewport();

var defaultProg = new Program('default');
var debugProg = new Program('debug');
var gbufferLightProg = new Program('gbufferLight');
var gbufferGeometryProg = new Program('gbufferGeometry');

var bowsette = new Mesh('bowsette');
var floor = new Mesh('floor');
var screenPlane = new RenderPlane();
var debugPlane = new RenderPlane(gl.canvas.width / 2.0, gl.canvas.height / 2.0);

var camera = new FocusCamera();
camera.viewAngle = vec3.fromValues(0.0, 1.0, 1.0);
camera.distance = 20.0;

var light = new PointLight();
light.worldLocation = [3.0, 3.0, 3.0];

// viewport

var lastTimestamp = 0;
function renderLoop(timestamp) {
  // update delta time
  var deltaTime = timestamp - lastTimestamp;
  lastTimestamp = timestamp;

  // Update html UI:
  document.getElementById("fps").innerHTML = 'fps: ' + Math.trunc(1000/deltaTime);

  // ------------ Render to FB ------------
  if (util.showDebugView) {
    // program
    defaultProg.use();
    // viewport
    viewport.renderToDebugFB();
    // camera
    camera.update();
    // light
    light.bind();
    // mesh
    bowsette.draw();
    floor.draw();
  }
  // ----------- End of Render to FB ------------

  // ----------- Forward rendering ------------
  if (util.useForwardShading) {
    // program
    defaultProg.use();
    // viewport
    viewport.renderToDefaultForwardShading();
    // camera
    camera.update();
    // light
    light.bind();
    // mesh
    bowsette.draw();
    floor.draw();

    // ------------ Render debug view ------------
    // draw debug screen
    if (util.showDebugView) {
      // program
      debugProg.use();
      // bind fb for reading
      viewport.bindDebugFB()
      // mesh
      debugPlane.draw();
    }
    // ------------ End of Render debug view ------------

  }
  // ------------ End of Forward Rendering ------------

  // ------------ Deferred rendering ------------
  if (!util.useForwardShading) {

    // ------------ Geometry pass ------------
    // program
    gbufferGeometryProg.use();
    // viewport
    viewport.renderToGBuffer();
    // camera
    camera.update();
    // mesh
    bowsette.draw();
    floor.draw();
    // ------------ End of Geometry pass ------------

    // ------------ Light pass ------------
    // program
    gbufferLightProg.use();
    // viewport
    viewport.renderToDefaultDeferredShading();
    // light
    light.bind();
    // mesh
    screenPlane.draw();
    // ------------ End of Light pass ------------

  }
  // ------------ End of Deferred rendering ------------

  // request next frame
  window.requestAnimationFrame(renderLoop);
}

window.requestAnimationFrame(renderLoop);