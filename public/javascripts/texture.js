import { gl } from './context.js';

class Texture2D {
  texture;
  image = new Image();
  constructor(file) {
    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0, // A GLint specifying the level of detail
      gl.RGBA, // internal format
      1, // width
      1, // height
      0, // A GLint specifying the width of the border. Must be 0.
      gl.RGBA, // upload format
      gl.UNSIGNED_BYTE, // upload type
      new Uint8Array([57, 197, 187, 255]));
    
    this.image.src = file;
    this.image.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.image.width, this.image.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, this.image);
      gl.generateMipmap(gl.TEXTURE_2D);

      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
  }

  bind(slot) {
    gl.activeTexture(slot);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
  }
};

export { Texture2D };