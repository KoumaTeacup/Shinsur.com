import { Program } from './shader.js';
import { Mesh, RenderPlane } from './mesh.js';
import { FocusCamera } from './camera.js';
import { PointLight } from './pointLight.js';
import { Viewport } from './viewport.js';
import { util } from './htmlUtil.js';
import { Framebuffer3D} from './framebuffer.js'
import { gl } from './context.js';
import * as vec3 from './gl-matrix/vec3.js';


var defaultProg = new Program('default');
var debugProg = new Program('debug');
var gbufferLightProg = new Program('gbufferLight');
var gbufferGeometryProg = new Program('gbufferGeometry');
var shadowProgrm = new Program('shadow');
var PCFHorizontalProgram = new Program('PCFFilter');
var pencilGeometryProgram = new Program('pencilGeometry');
var pencilLightProgram = new Program('pencilLight');
var contourLightProgram = new Program('contourLight');
var contourShakingProgram = new Program('contourShaking');
var hatchingPrepareProgram = new Program('hatchingPrepare');
var hatchingDebugProgram = new Program('hatchingDebug');
var normalViewProgram = new Program('normalView');
var curvatureViewProgram = new Program('curvatureView');

var floor = new Mesh('floor');
var bowsette = new Mesh('bowsette');
var cubes = new Mesh('cubes');
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

// Initialize our pipe, Contructor needed, don't delete
var viewport = new Viewport(() => {
  // When loaded, genrate Hatching Texture
  // program
  hatchingPrepareProgram.use();
  // viewport
  viewport.renderToHatchingBuffer()
    .enableBlend(false)
    .enableFaceCull(false)
    .enableDepthTest(false)
    .clearFrame(1, 1, 1, 1);
  // mesh
  screenPlane.draw();
});

function renderLoop(timestamp) {
  
  // update delta time
  var deltaTime = timestamp - lastTimestamp;
  lastTimestamp = timestamp;

  // Update html UI:
  document.getElementById("fps").innerHTML = 'fps: ' + Math.trunc(1000 / deltaTime);

  // ----------- Shadow Pass------------
  if (!util.shadowDisabled) {
    for (let light of lights) {
      // program
      shadowProgrm.use();
      // viewport
      viewport.renderToShadowMap()
        .enableBlend(false)
        .enableFaceCull(true)
        .enableDepthTest(true)
        .clearFrame();
      // light
      light.bindForShadow();
      // mesh
      bowsette.draw();
      floor.draw();

      if (util.PCFEnabled) {
        // program
        PCFHorizontalProgram.use();
        // viewport
        viewport.bindPCFHorizontal()
          .enableBlend(false)
          .enableFaceCull(false)
          .enableDepthTest(false)
          .clearFrame();
        // mesh
        screenPlane.draw();

        // viewprot
        viewport.bindPCFVertical()
          .clearFrame();
        // mesh
        screenPlane.draw();
      }
    }
  }
  // ----------- End of Shadow Pass ------------

  // clear html per frame data
  util.totalTries = 0;

  if (!util.useNPR) {

    // ----------- Forward rendering ------------
    if (util.useForwardShading) {
      // program
      defaultProg.use();
      // viewport
      viewport.renderToDefault()
        .enableBlend(false)
        .enableFaceCull(true)
        .enableDepthTest(true)
        .clearFrame(0.22, 0.77, 0.73, 1.0) // use miku blue for forward shading
        .readShadowMap();
      // camera
      camera.update();
      // light
      lights[0].bind();
      lights[0].bindForShadow();
      // mesh
      bowsette.draw();
      floor.draw();
      //test.draw();
    }
    // ------------ End of Forward Rendering ------------

    // ------------ Deferred rendering ------------
    if (!util.useForwardShading) {

      // ------------ Geometry pass ------------
      // program
      gbufferGeometryProg.use();
      // viewport
      viewport.renderToGBuffer()
        .enableBlend(false)
        .enableFaceCull(true)
        .enableDepthTest(true)
        .clearFrame();
      // camera
      camera.update();
      // mesh
      bowsette.draw();
      floor.draw();
      //test.draw();

      // ------------ Light pass ------------
      // program
      gbufferLightProg.use();
      // viewport
      viewport.renderToDefault()
        .readGBuffer()
        .readShadowMap()
        .enableBlend(true)
        .enableFaceCull(false)
        .enableDepthTest(false)
        .clearFrame();
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
        viewport.renderToDefault()
          .readDebugBuffer()
          .enableBlend(false)
          .enableFaceCull(false)
          .enableDepthTest(false)
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
      viewport.renderToDefault()
        .enableBlend(false)
        .enableFaceCull(true)
        .enableDepthTest(true)
        .clearFrame()
        .showSmoothedNormal(util.showSmoothedNormal.value);
      // camera
      camera.update();
      // mesh
      cubes.draw();
      //test.draw();
    } else if (util.curvatureView.value) {
      // program
      curvatureViewProgram.use();
      // viewport
      viewport.renderToDefault()
        .enableBlend(false)
        .enableFaceCull(true)
        .enableDepthTest(true)
        .clearFrame()
        .clearFrame(1, 1, 1, 1);
      // camera
      camera.update();
      // mesh
      //teapot.draw();
      cubes.draw();
      //test.draw();
    } else if(util.hatchingView.value) {
      // program
      hatchingPrepareProgram.use();
      // viewport
      viewport.renderToHatchingBuffer()
        .enableBlend(false)
        .enableFaceCull(false)
        .enableDepthTest(false)
        .clearFrame(1, 1, 1, 1);
      // mesh
      screenPlane.draw();

      // program
      hatchingDebugProgram.use();
      // viewport
      viewport.renderToDefault()
        .readHatchingBuffer()
        .enableBlend(false)
        .enableFaceCull(false)
        .enableDepthTest(false)
        .clearFrame(1, 1, 1, 1);
      // mesh
      squarePlane.draw();
      
    } else {

      // ------------ Contour Geometry pass ------------
      // program
      pencilGeometryProgram.use();
      // viewport
      viewport.renderToGBuffer()
        .enableBlend(false)
        .enableFaceCull(true)
        .enableDepthTest(true)
        .clearFrame();
      // camera
      camera.update();
      // mesh
      cubes.draw();
      //test.draw();

      // ------------ Contour Light pass ------------
      // program
      contourLightProgram.use();
      // viewport
      viewport.renderToGenericFBO(0)
        .readGBuffer()
        .enableBlend(false)
        .enableFaceCull(false)
        .enableDepthTest(false)
        .clearFrame(1, 1, 1, 1);

      //viewport.bindShadowMap();

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
      viewport.renderToDefault()
        .readGenericFBO(0)
        //.readShadowMap()
        .enableBlend(false)
        .enableFaceCull(false)
        .enableDepthTest(false)
        .clearFrame(1, 1, 1, 1);
      // mesh
      screenPlane.draw();

      // ------------ Pencil Lighting pass ------------
      // program
      pencilLightProgram.use();
      // viewport
      viewport.renderToDefault()
        .readGBuffer()
        .readHatchingBuffer()
        //.enableBlend(true, gl.FUNC_REVERSE_SUBTRACT, gl.FUNC_ADD, gl.ONE_MINUS_SRC_COLOR, gl.ONE)
        .enableBlend(true, gl.MIN)
        .enableFaceCull(false)
        .enableDepthTest(false)
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