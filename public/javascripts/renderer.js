import { Program } from './shader.js';
import { Mesh, RenderPlane } from './mesh.js';
import { FocusCamera } from './camera.js';
import { PointLight } from './pointLight.js';
import { Viewport } from './viewport.js';
import { gl } from './context.js';
import * as vec3 from './gl-matrix/vec3.js';

class Renderer {
  // Camera ---------------------------------
  camera = new FocusCamera();

  // Lights ---------------------------------
  lights = [new PointLight()];

  // Viewport ---------------------------------
  viewport;

  // Shaders ---------------------------------
  defaultProg = new Program('default');
  debugProg = new Program('debug');
  gbufferLightProg = new Program('gbufferLight');
  gbufferGeometryProg = new Program('gbufferGeometry');
  shadowProgrm = new Program('shadow');
  PCFHorizontalProgram = new Program('PCFFilter');
  //pencilGeometryProgram = new Program('pencilGeometry');
  pencilLightProgram = new Program('pencilLight');
  contourLightProgram = new Program('contourLight');
  contourShakingProgram = new Program('contourShaking');
  hatchingPrepareProgram = new Program('hatchingPrepare');
  hatchingDebugProgram = new Program('hatchingDebug');
  normalViewProgram = new Program('normalView');
  curvatureViewProgram = new Program('curvatureView');

  // Meshes ---------------------------------
  floor = new Mesh('floor');
  //bowsette = new Mesh('bowsette');
  //cubes = new Mesh('cubes');
  //cube = new Mesh('cube');
  test = new Mesh('test');
  //teapot = new Mesh('UtahTeapot');
  DrawMeshes = [];

  // RenderPlanes ---------------------------------
  screenPlane = new RenderPlane();
  debugPlane = new RenderPlane(640, 360);
  squarePlane = new RenderPlane(720, 720);

  constructor() {
    this.DrawMeshes = [this.test, this.floor];

    this.camera.viewAngle = vec3.fromValues(0.0, 1.0, 1.0);
    this.camera.distance = 20.0;

    this.lights[0].worldLocation = [16.0, 30.0, 6.0];

    // Initialize our pipe, Contructor needed, don't delete
    this.viewport = new Viewport(() => {
      // When loaded, genrate Hatching Texture
      // program
      this.hatchingPrepareProgram.use();
      // viewport
      this.viewport.renderToHatchingBuffer()
        .enableBlend(false)
        .enableFaceCull(false)
        .enableDepthTest(false)
        .clearFrame(1, 1, 1, 1);
      // mesh
      this.screenPlane.draw();
    });
  }

  drawShadowPass(PCFEnabled) {
    for (let light of this.lights) {
      // program
      this.shadowProgrm.use();
      // viewport
      this.viewport.renderToShadowMap()
        .enableBlend(false)
        .enableFaceCull(true)
        .enableDepthTest(true)
        .clearFrame();
      // light
      light.bindForShadow();
      // mesh
      this.DrawMeshes.forEach(mesh => mesh.draw());

      if (!PCFEnabled) {
        continue;
      }

      // program
      this.PCFHorizontalProgram.use();
      // viewport
      this.viewport.bindPCFHorizontal()
        .enableBlend(false)
        .enableFaceCull(false)
        .enableDepthTest(false)
        .clearFrame();
      // mesh
      this.screenPlane.draw();

      // viewprot
      this.viewport.bindPCFVertical()
        .clearFrame();
      // mesh
      this.screenPlane.draw();
    }
  }

  drawPBRForward() {
    // program
    this.defaultProg.use();
    // viewport
    this.viewport.renderToDefault()
      .enableBlend(false)
      .enableFaceCull(true)
      .enableDepthTest(true)
      .clearFrame(0.22, 0.77, 0.73, 1.0) // use miku blue for forward shading
      .readShadowMap()
      .UseNPRSlider();
    // camera
    this.camera.update();
    // light
    this.lights[0].bind();
    this.lights[0].bindForShadow();
    // mesh
    this.DrawMeshes.forEach(mesh => mesh.draw());
  }

  drawPBRDeferredGeometryPass() {
    // program
    this.gbufferGeometryProg.use();
    // viewport
    this.viewport.renderToGBuffer()
      .enableBlend(false)
      .enableFaceCull(true)
      .enableDepthTest(true)
      .clearFrame();
    // camera
    this.camera.update();
    // mesh
    this.DrawMeshes.forEach(mesh => mesh.draw());
  }

  drawPBRDeferredLightingPass() {
    // program
    this.gbufferLightProg.use();
    // viewport
    this.viewport.renderToDefault()
      .readGBuffer()
      .readShadowMap()
      .enableBlend(true)
      .enableFaceCull(false)
      .enableDepthTest(false)
      .clearFrame()
      .UseNPRSlider();
    // camera
    this.camera.update();
    // light
    this.lights[0].bind();
    this.lights[0].bindForShadow();
    // mesh
    this.screenPlane.draw();
  }

  drawGBufferDebugView() {
    // program
    this.debugProg.use();
    // viewport
    this.viewport.renderToDefault()
      .readDebugBuffer()
      .enableBlend(false)
      .enableFaceCull(false)
      .enableDepthTest(false)
    // mesh
    this.debugPlane.draw();
  }

  drawNormalSmoothingView() {
    // program
    this.normalViewProgram.use();
    // viewport
    this.viewport.renderToDefault()
      .enableBlend(false)
      .enableFaceCull(true)
      .enableDepthTest(true)
      .clearFrame()
      .showSmoothedNormal();
    // camera
    this.camera.update();
    // mesh
    this.DrawMeshes.forEach(mesh => mesh.draw());
  }

  drawCurvatureView() {
    // program
    this.curvatureViewProgram.use();
    // viewport
    this.viewport.renderToDefault()
      .enableBlend(false)
      .enableFaceCull(true)
      .enableDepthTest(true)
      .clearFrame()
      .clearFrame(1, 1, 1, 1);
    // camera
    this.camera.update();
    // mesh
    this.DrawMeshes.forEach(mesh => mesh.draw());
  }

  drawHatchingView() {
    // program
    this.hatchingPrepareProgram.use();
    // viewport
    this.viewport.renderToHatchingBuffer()
      .enableBlend(false)
      .enableFaceCull(false)
      .enableDepthTest(false)
      .clearFrame(1, 1, 1, 1);
    // mesh
    this.screenPlane.draw();

    // program
    this.hatchingDebugProgram.use();
    // viewport
    this.viewport.renderToDefault()
      .readHatchingBuffer()
      .enableBlend(false)
      .enableFaceCull(false)
      .enableDepthTest(false)
      .clearFrame(1, 1, 1, 1);
    // mesh
    this.squarePlane.draw();
  }

  drawNPRGeometryPass() {
    // program
    this.gbufferGeometryProg.use();
    // viewport
    this.viewport.renderToGBuffer()
      .readHatchingBuffer()
      .enableBlend(false)
      .enableFaceCull(true)
      .enableDepthTest(true)
      .clearFrame();
    // camera
    this.camera.update();
    // mesh
    this.DrawMeshes.forEach(mesh => mesh.draw());
  }

  drawNPRContourLightingPass() {
    // program
    this.contourLightProgram.use();
    // viewport
    this.viewport.renderToGenericFBO(0)
      .readGBuffer()
      .enableBlend(false)
      .enableFaceCull(false)
      .enableDepthTest(false)
      .clearFrame(1, 1, 1, 1);

    // camera
    this.camera.update();
    // light
    this.lights[0].bind();
    this.lights[0].bindForShadow();
    // mesh
    this.screenPlane.draw();
  }

  drawNPRContourShakingPass(isDebug) {
    // program
    this.contourShakingProgram.use();
    // viewport
    this.viewport.renderToDefault()
      .readGenericFBO(0)
      .enableBlend(false)
      .enableFaceCull(false)
      .enableDepthTest(false);
      //.clearFrame(1, 1, 1, 1);

    if (!isDebug) this.viewport.UseNPRSlider();

    // mesh
    this.screenPlane.draw();
  }

  drawNPRPencilLightingPass() {
    // program
    this.pencilLightProgram.use();
    // viewport
    this.viewport.renderToDefault()
      .readHatchingBuffer()
      .readGBuffer()
      .readShadowMap()
      .readBackground()
      //.enableBlend(true, gl.FUNC_REVERSE_SUBTRACT, gl.FUNC_ADD, gl.ONE_MINUS_SRC_COLOR, gl.ONE)
      .enableBlend(true, gl.MIN)
      .enableFaceCull(false)
      .enableDepthTest(false)
      .UseNPRSlider();
    // light
    this.lights[0].bind();
    this.lights[0].bindForShadow();
    // mesh
    this.screenPlane.draw();
  }
}
export { Renderer }