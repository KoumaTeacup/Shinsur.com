import { gl } from './context.js';
import * as vec3 from './gl-matrix/vec3.js';

class PointLight {
  worldLocation = vec3.fromValues(0.0, 0.0, 0.0);
  intensity;
  attenuation;

  constructor() {

  }

  bind() {
    // Get current program
    var currShader = gl.getParameter(gl.CURRENT_PROGRAM);
    if (!currShader) {
      console.log('[Warning] Texture binding failed, no bound program found');
      return;
    }

    var uniformLoc = gl.getUniformLocation(currShader, 'LightPos');
    gl.uniform3fv(uniformLoc, this.worldLocation);
  }
}
export { PointLight };