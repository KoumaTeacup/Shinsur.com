import { gl } from './context.js';

class Texture2D {
  name;
  texture;
  image = new Image();
  initialized = false;

  constructor(file) {
    if (file) {
      this.name = file;
    } else {
      console.log('[Warning] Texture must be initialized with a file name!');
      return;
    }

    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    // use miku blue as the default color before the texture is loaded
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([57, 197, 187, 255]));

    // upload external texture
    this.image.src = file;
    this.image.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.image.width, this.image.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, this.image);
      gl.generateMipmap(gl.TEXTURE_2D);

      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      this.initialized = true;
    }
  }

  bind(uniform, slot) {
    if (!this.initialized) {
      console.log('[Log] Texture binding skipped, texture \'' + this.name + '\' not initialized');
      return;
    }

    // Activate slot
    gl.activeTexture(gl.TEXTURE0 + slot);

    // Bind slot
    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    // Get current program
    var currShader = gl.getParameter(gl.CURRENT_PROGRAM);
    if (!currShader) {
      console.log('[Warning] Texture binding failed, no bound program found');
      return;
    }

    // Set uniform
    var uniformLoc = gl.getUniformLocation(currShader, uniform);
    gl.uniform1i(uniformLoc, slot);
  }
};

export { Texture2D };