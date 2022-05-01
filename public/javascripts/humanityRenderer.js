import { Program } from './shader.js';
import { RenderPlane } from './mesh.js';
import { FocusCamera } from './camera.js';
import { Viewport } from './viewport.js';
import { PointLight } from './pointLight.js';
import * as vec3 from './gl-matrix/vec3.js';

class Renderer {
  // Camera ---------------------------------
  camera = new FocusCamera();

  // Lights ---------------------------------
  lights = [new PointLight()];

  // Viewport ---------------------------------
  viewport = new Viewport();

  // Shaders ---------------------------------
  humanityProgram = new Program('humanity');
  humanityOutputProgram = new Program('humanityOutput');

  // Meshes ---------------------------------
  DrawMeshes = [];

  // RenderPlanes ---------------------------------
  humanityCanvas = new RenderPlane(1920, 1080);

  constructor() {
    this.DrawMeshes = [this.test, this.floor];

    this.camera.viewAngle = vec3.fromValues(0.0, 1.0, 1.0);
    this.camera.distance = 20.0;

    this.lights[0].worldLocation = [16.0, 30.0, 26.0];
  }
}

export { Renderer }