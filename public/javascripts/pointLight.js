import { gl } from './context.js';
import { Program } from './shader.js';
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
    Program.setUniform3fv('LightPos', this.worldLocation);
    Program.setUniform1f('LightIntensity', this.intensity);
    Program.setUniform3fv('LightColor', this.color);
  }

  bindForShadow() {
    var matView = mat4.lookAt(
      [],
      this.worldLocation,
      vec3.fromValues(0.0, 0.0, 0.0),
      vec3.fromValues(0.0, 1.0, 0.0));

    // Compute projection matrix
    var matPorj = mat4.perspective(
      [],
      2.0,
      1.0,
      0.1,
      100);

    // Set uniform
    Program.setUniformMatrix4fv('MatShadowView', matView);
    Program.setUniformMatrix4fv('MatShadowProj', matPorj);
  }
}
export { PointLight };