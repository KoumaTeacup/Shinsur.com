import { gl } from './context.js';
import { Framebuffer } from './framebuffer.js';
import { GBuffer } from './gbuffer.js';

class Viewport {
  debugFBO = new Framebuffer();
  gBuffer = new GBuffer();
constructor() {
    gl.cullFace(gl.BACK);
  }

  renderToDefaultForwardShading() {
    // unbind framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // canvas size
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    gl.disable(gl.BLEND);
    gl.enable(gl.CULL_FACE); // use back face culling for forward shading
    gl.enable(gl.DEPTH_TEST); // use depth test

    gl.clearColor(0.22, 0.77, 0.73, 1.0); // use miku blue for forward shading
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }

  renderToDefaultDeferredShading() {
    this.gBuffer.bindForReading();

    // canvas size
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.ONE, gl.ONE);

    gl.disable(gl.CULL_FACE); // we don't need face culling
    gl.disable(gl.DEPTH_TEST); // we don't need depth testing for deferred shading

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }

  renderToDebugFB() {
    this.debugFBO.bindFB();

    // canvas size
    gl.viewport(0, 0, this.debugFBO.width, this.debugFBO.height);

    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);

    gl.clearColor(1, 0, 0, 1); // use red for debug buffer
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }

  renderToGBuffer() {
    this.gBuffer.bindForWriting();

    // canvas size
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    gl.disable(gl.BLEND);

    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }

  bindDebugFB() {
    this.debugFBO.bindRender();
  }
}
export { Viewport };