import { gl } from './context.js';
import { Framebuffer } from './framebuffer.js';
import { GBuffer } from './gbuffer.js';

class Viewport {
  shadowFBO;
  gBuffer = new GBuffer();
  GaussianBlurFBO;
  PCFKernelSize = 7;
  PCFKernel = [];
  PCFKernelSum;
  GaussianWidth = 50;
  constructor() {
    // Read resolution from settings
    var shadowResElem = document.shadowResForm.shadowRes;
    for (var i = 0; i < shadowResElem.length; i++) {
      shadowResElem[i].onchange = (e) => {
        var shadowRes = e.target.value;
        this.shadowFBO.resize(shadowRes, shadowRes);
      }
    }

    var shadowRes = shadowResElem.value;
    this.shadowFBO = new Framebuffer(shadowRes, shadowRes);
    this.GaussianBlurFBO = new Framebuffer(this.shadowFBO.width, this.shadowFBO.height);

    gl.cullFace(gl.BACK);

    this.calculatePCFKernel();
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
    this.gBuffer.bindAllForReading();
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

  // this is expected to be called only after normal deferred shading render pass
  renderToDefaultDeferredShadingDebug() {
    gl.disable(gl.BLEND);

    this.gBuffer.bindDebugBuffer();
  }

  renderToShadowMap() {
    this.shadowFBO.bindForWriting();

    // canvas size
    gl.viewport(0, 0, this.shadowFBO.width, this.shadowFBO.height);

    gl.disable(gl.BLEND);
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);

    gl.clearColor(0, 0, 0, 1); // use red for debug buffer
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

  bindShadowMap() {
    this.shadowFBO.bindForReading(7, 'ShadowSampler');
  }

  bindCustomFBForDebug() {
    this.shadowFBO.bindForReading(0, 'DebugBufferSampler');
  }

  bindPCFHorizontal() {
    // resize the filter if it's different from shadow texture
    if (this.GaussianBlurFBO.width !== this.shadowFBO.width
      || this.GaussianBlurFBO.height !== this.shadowFBO.height) {
      this.GaussianBlurFBO.resize(this.shadowFBO.width, this.shadowFBO.height);
    }
    // Unbind textures, call this first
    this.GaussianBlurFBO.bindForWriting();
    this.shadowFBO.bindForReading(0, 'InputSampler');

    gl.viewport(0, 0, this.GaussianBlurFBO.width, this.GaussianBlurFBO.height);
    gl.disable(gl.BLEND);
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.DEPTH_TEST);

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Get current program
    var currShader = gl.getParameter(gl.CURRENT_PROGRAM);
    if (!currShader) {
      console.log('[Warning] Texture binding failed, no bound program found');
      return;
    }

    // Set uniform
    var uniformLoc = gl.getUniformLocation(currShader, 'KernelSize');
    gl.uniform1i(uniformLoc, this.PCFKernelSize);
    var uniformLoc = gl.getUniformLocation(currShader, 'KernelSum');
    gl.uniform1f(uniformLoc, this.PCFKernelSum);
    var uniformLoc = gl.getUniformLocation(currShader, 'Kernel');
    gl.uniform1fv(uniformLoc, new Float32Array(this.PCFKernel));
    var uniformLoc = gl.getUniformLocation(currShader, 'IsHorizontal');
    gl.uniform1i(uniformLoc, true);
  }

  // must be coupled with horizontal filter above
  bindPCFVertical() {
    // Unbind textures, call this first
    this.shadowFBO.bindForWriting();
    this.GaussianBlurFBO.bindForReading(0, 'InputSampler');

    gl.viewport(0, 0, this.shadowFBO.width, this.shadowFBO.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Get current program
    var currShader = gl.getParameter(gl.CURRENT_PROGRAM);
    if (!currShader) {
      console.log('[Warning] Texture binding failed, no bound program found');
      return;
    }

    var uniformLoc = gl.getUniformLocation(currShader, 'IsHorizontal');
    gl.uniform1i(uniformLoc, false);
  }

  calculatePCFKernel() {
    var constant = 1.0 / this.GaussianWidth * Math.sqrt(2.0 * Math.PI);
    var exp = Math.pow(Math.E, -0.5 / this.GaussianWidth / this.GaussianWidth);
    this.PCFKernelSum = 0;
    for (var i = 0; i < this.PCFKernelSize; i++) {
      var distance = Math.floor(this.PCFKernelSize / 2) - i;
      this.PCFKernel[i] = Math.pow(exp, distance * distance);
      this.PCFKernelSum += this.PCFKernel[i];
    }
  }
}
export { Viewport };