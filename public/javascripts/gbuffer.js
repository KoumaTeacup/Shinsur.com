import { gl } from './context.js';
import { util } from './htmlUtil.js';
import { Program } from './shader.js';

class GBuffer {
  fb;
  depthBuffer;
  texturesInfo = [
    { type: 'position', uniform: 'WorldPosSampler', object: 0 },
    { type: 'diffuse', uniform: 'DiffuseSampler', object: 0 },
    { type: 'normal', uniform: 'NormalSampler', object: 0 },
    { type: 'snormal', uniform: 'SNormalSampler', object: 0 },
    { type: 'texCoord', uniform: 'TexCoordSampler', object: 0 }];
  width = gl.canvas.width;
  height = gl.canvas.height;
  plane;

  constructor() {
    // create framebuffer
    this.fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb);

    // create all buffer textures
    var attachementArray = [];
    for (let texInfo of this.texturesInfo) {
      // create texture
      var newTexture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, newTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, this.width, this.height, 0, gl.RGBA, gl.FLOAT, null);

      // no mip & clamp to edge
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); // gl.NEAREST prevent interpolation
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST); // gl.NEAREST prevent interpolation
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      var index = this.texturesInfo.findIndex((element) => element.type === texInfo.type);
      // attach texture to framebuffer
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + index, gl.TEXTURE_2D, newTexture, 0);

      attachementArray.push(gl.COLOR_ATTACHMENT0 + index);

      texInfo.object = newTexture;
    }

    // create & attach depth buffer
    this.depthBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.depthBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this.width, this.height);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.depthBuffer);

    gl.drawBuffers(attachementArray);

    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      console.log('[Framebuffer error]: ' + gl.checkFramebufferStatus(gl.FRAMEBUFFER));
    }
  }

  bindForWriting() {
    // this is lazy unbind, which can cause surprises, call this before any other texture binding within this draw call
    // unbind textures
    for (let i = 0; i < this.texturesInfo.length; i++) {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, null);
    }

    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.fb);
  }

  bindAllForReading() {
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);

    // bind textures
    for (let texInfo of this.texturesInfo) {
      var index = this.texturesInfo.findIndex((element) => element.type === texInfo.type);
      gl.activeTexture(gl.TEXTURE0 + index);
      gl.bindTexture(gl.TEXTURE_2D, texInfo.object);

      Program.setUniform1i(texInfo.uniform, index);
    }
  }

  bindDebugBuffer() {
    var bufferType;
    switch (util.slectedBufferIndex) {
      case 0: bufferType = 'position'; break;
      case 1: bufferType = 'diffuse'; break;
      case 2: bufferType = 'normal'; break;
      case 3: bufferType = 'snormal'; break;
      case 4: bufferType = 'texCoord'; break;
      default: return;
    }
    var index = this.texturesInfo.findIndex((element) => element.type === bufferType);

    gl.activeTexture(gl.TEXTURE0 + index);
    gl.bindTexture(gl.TEXTURE_2D, this.texturesInfo[index].object);
    Program.setUniform1i('DebugBufferSampler', index);
  }
}

export { GBuffer };