import { gl } from './context.js';
import { util } from './htmlUtil.js';

class GBuffer {
  fb;
  depthBuffer;
  texturesInfo = [
    { type: 'position', uniform: 'WorldPosSampler', object: 0 },
    { type: 'diffuse', uniform: 'DiffuseSampler', object: 0 },
    { type: 'normal', uniform: 'NormalSampler', object: 0 },
    { type: 'texCoord', uniform: 'TexCoordSampler', object: 0 }];
  width = gl.canvas.width;
  height = gl.canvas.height;
  plane;

  constructor() {
    // create framebuffer
    this.fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb);

    // create all buffer textures
    var internalFormat, format, dataType;
    var attachementArray = [];
    for (var texInfo of this.texturesInfo) {
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
    for (var i = 0; i < this.texturesInfo.length; i++) {
      // Activate slot
      gl.activeTexture(gl.TEXTURE0 + i);

      // Bind slot
      gl.bindTexture(gl.TEXTURE_2D, null);
    }

    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.fb);
  }

  bindAllForReading() {
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);

    // Get current program
    var currShader = gl.getParameter(gl.CURRENT_PROGRAM);
    if (!currShader) {
      console.log('[Warning] Texture binding failed, no bound program found');
      return;
    }

    // bind textures
    for (var texInfo of this.texturesInfo) {
      var index = this.texturesInfo.findIndex((element) => element.type === texInfo.type);
      // Activate slot
      gl.activeTexture(gl.TEXTURE0 + index);

      // Bind slot
      gl.bindTexture(gl.TEXTURE_2D, texInfo.object);

      // Set uniform
      var uniformLoc = gl.getUniformLocation(currShader, texInfo.uniform);
      gl.uniform1i(uniformLoc, index);
    }
  }

  bindDebugBuffer() {
    // Get current program
    var currShader = gl.getParameter(gl.CURRENT_PROGRAM);
    if (!currShader) {
      console.log('[Warning] Texture binding failed, no bound program found');
      return;
    }
    var bufferType;
    switch (util.slectedBufferIndex) {
      case 0: bufferType = 'position'; break;
      case 1: bufferType = 'diffuse'; break;
      case 2: bufferType = 'normal'; break;
      default: return;
    }
    var index = this.texturesInfo.findIndex((element) => element.type === bufferType);
    // Activate slot
    gl.activeTexture(gl.TEXTURE0 + index);

    // Bind slot
    gl.bindTexture(gl.TEXTURE_2D, this.texturesInfo[index].object);

    // Set uniform
    var uniformLoc = gl.getUniformLocation(currShader, 'DebugBufferSampler');
    gl.uniform1i(uniformLoc, index);
  }

}

export { GBuffer };