import { Program } from './shader.js';
import { Mesh, RenderPlane } from './mesh.js';
import { FocusCamera } from './camera.js';
import { PointLight } from './pointLight.js';
import { Viewport } from './viewport.js';
import { util } from './htmlUtil.js';
import { Framebuffer3D} from './framebuffer.js'
import * as vec3 from './gl-matrix/vec3.js';

// Contructor needed, don't delete
var viewport = new Viewport();

var defaultProg = new Program('default');
var debugProg = new Program('debug');
var gbufferLightProg = new Program('gbufferLight');
var gbufferGeometryProg = new Program('gbufferGeometry');
var shadowProgrm = new Program('shadow');
var PCFHorizontalProgram = new Program('PCFFilter');
var pencilGeometryProgram = new Program('pencilGeometry');
var contourLightProgram = new Program('contourLight');
var contourShakingProgram = new Program('contourShaking');
var hatchingPrepareProgram = new Program('hatchingPrepare');
var hatchingDebugProgram = new Program('hatchingDebug');
var normalViewProgram = new Program('normalView');
var curvatureViewProgram = new Program('curvatureView');

//var floor = new Mesh('floor');
//var bowsette = new Mesh('bowsette');
//var cubes = new Mesh('cubes');
//var cube = new Mesh('cube');
var test = new Mesh('test');
//var teapot = new Mesh('UtahTeapot');

var screenPlane = new RenderPlane();
var debugPlane = new RenderPlane(640, 360);
var squarePlane = new RenderPlane(720, 720);

var camera = new FocusCamera();
camera.viewAngle = vec3.fromValues(0.0, 1.0, 1.0);
camera.distance = 20.0;

var lights = [new PointLight()];
lights[0].worldLocation = [6.0, 6.0, 6.0];

// viewport

var lastTimestamp = 0;

var fbo = new Framebuffer3D();

// Genrate Hatching Texture
hatchingPrepareProgram.use();
viewport.renderToHatchingPrepare();
screenPlane.draw();

function renderLoop(timestamp) {
  // update delta time
  var deltaTime = timestamp - lastTimestamp;
  lastTimestamp = timestamp;

  // Update html UI:
  document.getElementById("fps").innerHTML = 'fps: ' + Math.trunc(1000 / deltaTime);

  // ----------- Shadow Pass------------
  //for (let light of lights) {
  //  // program
  //  shadowProgrm.use();
  //  // viewport
  //  viewport.renderToShadowMap();
  //  // light
  //  light.bindForShadow();
  //  // mesh
  //  bowsette.draw();
  //  floor.draw();

  //  if (util.PCFEnabled) {
  //    // program
  //    PCFHorizontalProgram.use();
  //    // viewport
  //    viewport.bindPCFHorizontal();
  //    // mesh
  //    screenPlane.draw();

  //    // viewprot
  //    viewport.bindPCFVertical();
  //    // mesh
  //    screenPlane.draw();
  //  }
  //}
  // ----------- End of Shadow Pass ------------

  // clear html per frame data
  util.totalTries = 0;

  if (!util.useNPR) {

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
      lights[0].bind();
      lights[0].bindForShadow();
      // mesh
      bowsette.draw();
      floor.draw();
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

      // ------------ Light pass ------------
      // program
      gbufferLightProg.use();
      // viewport
      viewport.renderToDefaultDeferredShading();
      viewport.bindShadowMap();
      // camera
      camera.update();
      // light
      lights[0].bind();
      lights[0].bindForShadow();
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
    }
    // ------------ End of Deferred rendering ------------
  } else {
    // ------------ Pencil Rendering ------------
    if (util.normalSmoothingView.value) {
      // program
      normalViewProgram.use();
      // viewport
      viewport.renderToDefaultNormalDebug();
      // camera
      camera.update();
      // mesh
      //teapot.draw();
      test.draw();
    } else if (util.curvatureView.value) {
      // program
      curvatureViewProgram.use();
      // viewport
      viewport.renderToDefaultCurvatureDebug();
      // camera
      camera.update();
      // mesh
      test.draw();
    } else if(util.hatchingView.value) {
      hatchingPrepareProgram.use();
      viewport.renderToHatchingPrepare();
      screenPlane.draw();
      hatchingDebugProgram.use();
      viewport.renderToDefaultHatchingDebug();
      squarePlane.draw();

      //const data = new Uint8Array(2 * 2 * 4);
      //gl.readPixels(0, 0, 2, 2, gl.RGBA, gl.UNSIGNED_BYTE, data);
      //console.log(data);
    } else {

      // ------------ Contour Geometry pass ------------
      // program
      pencilGeometryProgram.use();
      // viewport
      viewport.renderToGBuffer();
      // camera
      camera.update();
      // mesh
      cubes.draw();

      // ------------ Contour Light pass ------------
      // program
      contourLightProgram.use();
      // viewport
      viewport.renderToContourShadingFBO(0);
      viewport.bindShadowMap();
      // camera
      camera.update();
      // light
      lights[0].bind();
      lights[0].bindForShadow();
      // mesh
      screenPlane.draw();

      // ------------ Contour Shaking pass ------------
      // program
      contourShakingProgram.use();
      // viewport
      viewport.renderToDefaultDeferredShading();
      viewport.bindScreenSizeFBO(0);
      // mesh
      screenPlane.draw();
    }
    // ------------ End of Pencil rendering ------------
  }
  // update html
  document.getElementById('triCount').innerHTML = 'Tries Drawn: ' + util.totalTries;

  util.recomputeSmoothNormal = false;

  // request next frame
  window.requestAnimationFrame(renderLoop);
}

window.requestAnimationFrame(renderLoop);