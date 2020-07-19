import { Program } from './shader.js';
import * as vec3 from './gl-matrix/vec3.js';
import { Mesh, RenderPlane } from './mesh.js';
import { FocusCamera } from './camera.js';
import { PointLight } from './pointLight.js';
import { Viewport } from './viewport.js';
import { util } from './htmlUtil.js';

// Contructor needed, don't delete
//var htmlUtil = new Utility();
var viewport = new Viewport();

var defaultProg = new Program('default');
var debugProg = new Program('debug');
var gbufferLightProg = new Program('gbufferLight');
var gbufferGeometryProg = new Program('gbufferGeometry');
var shadowProgrm = new Program('shadow');
var PCFHorizontalProgram = new Program('PCFFilter');

var bowsette = new Mesh('bowsette');
var floor = new Mesh('floor');
var screenPlane = new RenderPlane();
var debugPlane = new RenderPlane(0.5);

var camera = new FocusCamera();
camera.viewAngle = vec3.fromValues(0.0, 1.0, 1.0);
camera.distance = 20.0;

var lights = [new PointLight()];
lights[0].worldLocation = [6.0, 6.0, 6.0];

// viewport

var lastTimestamp = 0;
function renderLoop(timestamp) {
  // update delta time
  var deltaTime = timestamp - lastTimestamp;
  lastTimestamp = timestamp;

  // Update html UI:
  document.getElementById("fps").innerHTML = 'fps: ' + Math.trunc(1000 / deltaTime);

  // ----------- Shadow Pass------------
  for (var light of lights) {
    // program
    shadowProgrm.use();
    // viewport
    viewport.renderToShadowMap();
    // light
    light.bindForShadow();
    // mesh
    bowsette.draw();
    floor.draw();

    // program
    PCFHorizontalProgram.use();
    // viewport
    viewport.bindPCFHorizontal();
    // mesh
    screenPlane.draw();

    // viewprot
    viewport.bindPCFVertical();
    // mesh
    screenPlane.draw();
  }
  // ----------- End of Shadow Pass ------------

  // ----------- Forward rendering ------------
  if (util.useForwardShading) {
    // program
    defaultProg.use();
    // viewport
    viewport.renderToDefaultForwardShading();
    viewport.bindShadowMap();
    // camera
    camera.update();
    // light
    light.bind();
    light.bindForShadow();
    // mesh
    bowsette.draw();
    floor.draw();

    // ------------ Render debug view ------------
    // draw debug screen
    if (util.showDebugView) {
      // program
      debugProg.use();
      // viewport
      viewport.bindCustomFBForDebug();
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
    viewport.bindShadowMap();
    // camera
    camera.update();
    // light
    light.bind();
    light.bindForShadow();
    // mesh
    screenPlane.draw();

    // ------------ Render debug view ------------
    // draw debug screen
    if (util.showDebugView) {
      // program
      debugProg.use();
      // viewport
      viewport.renderToDefaultDeferredShadingDebug();
      // mesh
      debugPlane.draw();
    }
    // ------------ End of Render debug view ------------

    // ------------ End of Light pass ------------
  }
  // ------------ End of Deferred rendering ------------

  // request next frame
  window.requestAnimationFrame(renderLoop);
}

window.requestAnimationFrame(renderLoop);