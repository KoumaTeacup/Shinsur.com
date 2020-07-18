﻿import { gl } from './context.js';
import * as vec4 from './gl-matrix/vec4.js';

class Material {
  name;
  useRawColor = false;
  RawColor = vec4.fromValues(0.0, 0.0, 0.0, 1.0);
  diffuse;
  specular;
  normalMap;
  rougeness = 0.4;


  constructor(_name) {
    this.name = _name;
  }

  bind() {
    // Get current program
    var currShader = gl.getParameter(gl.CURRENT_PROGRAM);
    if (!currShader) {
      console.log('[Warning] Texture binding failed, no bound program found');
      return;
    }

    var uniformLoc;

    uniformLoc = gl.getUniformLocation(currShader, 'UseRawColor');
    gl.uniform1i(uniformLoc, this.useRawColor);

    uniformLoc = gl.getUniformLocation(currShader, 'Roughness');
    gl.uniform1f(uniformLoc, this.rougeness);

    if (this.useRawColor) {
      uniformLoc = gl.getUniformLocation(currShader, 'RawColor');
      gl.uniform4fv(uniformLoc, this.RawColor);
    } else {
      if (this.diffuse) this.diffuse.bind('DiffuseSampler', 0);
      if (this.specular) this.specular.bind('SpecularSampler', 1);
      if (this.normalMap) this.normalMap.bind('NormalSampler', 2);
    }
  }
}

export { Material };