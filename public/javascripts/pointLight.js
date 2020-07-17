import { gl } from './context.js';
import * as vec3 from './gl-matrix/vec3.js';
import * as mat4 from './gl-matrix/mat4.js';

class PointLight {
  worldLocation = vec3.fromValues(0.0, 0.0, 0.0);
  intensity = 1.0;
  attenuation;
  color = vec3.fromValues(1.0, 1.0, 1.0);

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
    var uniformLoc = gl.getUniformLocation(currShader, 'LightIntensity');
    gl.uniform1f(uniformLoc, this.intensity);
    var uniformLoc = gl.getUniformLocation(currShader, 'LightColor');
    gl.uniform3fv(uniformLoc, this.color);
  }

  bindForShadow() {
    // Get current program
    var currShader = gl.getParameter(gl.CURRENT_PROGRAM);
    if (!currShader) {
      console.log('[Warning] Texture binding failed, no bound program found');
      return;
    }

    var matView = mat4.lookAt(
      [],
      this.worldLocation,
      vec3.fromValues(0.0, 0.0, 0.0),
      vec3.fromValues(0.0, 1.0, 0.0));

    // Compute projection matrix
    var matPorj = mat4.perspective(
      [],
      1.0,
      1.0,
      0.1,
      100);

    // Set uniform
    var uniformLoc = gl.getUniformLocation(currShader, 'MatView');
    gl.uniformMatrix4fv(uniformLoc, false, matView);
    var uniformLoc = gl.getUniformLocation(currShader, 'MatProj');
    gl.uniformMatrix4fv(uniformLoc, false, matPorj);
  }
}
export { PointLight };