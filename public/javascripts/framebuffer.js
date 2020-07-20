import { gl } from './context.js';
import { Program } from './shader.js';

class Framebuffer {
  fb;
  colorBuffer;
  depthBuffer;
  width;
  height;
  lastBoundSlot = 0;

  constructor(_width = 1024, _height = 1024) {
    this.width = _width;
    this.height = _height;

    // create render buffer
    this.colorBuffer = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.colorBuffer);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, this.width, this.height, 0, gl.RGBA, gl.FLOAT, null);

    // no mip & clamp to edge
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
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

  }

  bindForWriting() {
    // Unbind texture, otherwise chrome is gonna complain
    gl.activeTexture(gl.TEXTURE0 + this.lastBoundSlot);
    if (gl.getParameter(gl.ACTIVE_TEXTURE) == this.colorBuffer)
      gl.bindTexture(gl.TEXTURE_2D, null);

    // Bind framebuffer for writing
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb);
  }

  bindForReading(slot, uniform) {
    // cache bound slot
    this.lastBoundSlot = slot;

    // Bind color buffer for shader sampler
    gl.activeTexture(gl.TEXTURE0 + slot);
    gl.bindTexture(gl.TEXTURE_2D, this.colorBuffer);
    Program.setUniform1i(uniform, slot);
  }

  resize(_width, _height) {
    this.width = _width;
    this.height = _height;
    // resize color buffer
    gl.bindTexture(gl.TEXTURE_2D, this.colorBuffer);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, this.width, this.height, 0, gl.RGBA, gl.FLOAT, null);
    // resize depth buffer
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.depthBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this.width, this.height);
  }
}

export { Framebuffer };