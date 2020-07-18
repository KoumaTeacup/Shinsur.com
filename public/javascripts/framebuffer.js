import { gl } from './context.js';
import { util } from './htmlUtil.js';

class Framebuffer {
  fb;
  colorBuffer;
  depthBuffer;
  width = 1024;
  height = 1024;

  constructor() {
    // Read resolution from settings
    var shadowResElem = document.shadowResForm.shadowRes;
    this.width = shadowResElem.value;
    this.height = shadowResElem.value;

    // create render buffer
    this.colorBuffer = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.colorBuffer);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, this.width, this.height, 0, gl.RGBA, gl.FLOAT, null);

    // no mip & clamp to edge
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // create depth buffer
    this.depthBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.depthBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this.width, this.height);

    //this.depthBuffer = gl.createTexture();
    //gl.bindTexture(gl.TEXTURE_2D, this.depthBuffer);
    //gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT, this.width, this.height, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
    //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // create framebuffer
    this.fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb);
    // render
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.colorBuffer, 0);
    // depth
    //gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.depthBuffer, 0); <- Why doesn't this work?
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.depthBuffer);

    for (var i = 0; i < shadowResElem.length; i++) {
      shadowResElem[i].onchange = (e) => {
        var shadowResolution = e.target.value;
        this.width = shadowResolution;
        this.height = shadowResolution;
        gl.bindTexture(gl.TEXTURE_2D, this.colorBuffer);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, this.width, this.height, 0, gl.RGBA, gl.FLOAT, null);
        gl.bindRenderbuffer(gl.RENDERBUFFER, this.depthBuffer);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this.width, this.height);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.colorBuffer, 0);
      }
    }
  }

  bindForWriting() {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb);
  }

  bindForReading(slot, uniform) {
    // Get current program
    var currShader = gl.getParameter(gl.CURRENT_PROGRAM);
    if (!currShader) {
      console.log('[Warning] Texture binding failed, no bound program found');
      return;
    }

    // Activate slot
    gl.activeTexture(gl.TEXTURE0 + slot);

    // bind texture to be used as sampler
    gl.bindTexture(gl.TEXTURE_2D, this.colorBuffer);

    // Set uniform
    var uniformLoc = gl.getUniformLocation(currShader, uniform);
    gl.uniform1i(uniformLoc, slot);
  }
}

export { Framebuffer };