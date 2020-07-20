import { gl } from './context.js';
import { Program } from './shader.js';
import * as vec4 from './gl-matrix/vec4.js';

class Material {
  name;
  useRawColor = false;
  RawColor = vec4.fromValues(0.0, 0.0, 0.0, 1.0);
  diffuse;
  specular;
  normalMap;
  roughness = 8.0;

  constructor(_name) {
    this.name = _name;
  }

  bind() {
    Program.setUniform1i('UseRawColor', this.useRawColor);
    Program.setUniform1f('Roughness', this.roughness);

    if (this.useRawColor) {
      Program.setUniform4fv('RawColor', this.RawColor);
    } else {
      if (this.diffuse) this.diffuse.bind('DiffuseSampler', 0);
      if (this.specular) this.specular.bind('SpecularSampler', 1);
      if (this.normalMap) this.normalMap.bind('NormalSampler', 2);
    }
  }
}

export { Material };