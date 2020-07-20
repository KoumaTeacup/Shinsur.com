import { gl } from './context.js';
import { Framebuffer } from './framebuffer.js';
import { GBuffer } from './gbuffer.js';
import { Program } from './shader.js';

class Viewport {
  shadowFBO;
  gBuffer = new GBuffer();
  GaussianBlurFBO;
  PCFKernelSize;
  PCFKernel = [];
  PCFKernelSum;
  GaussianWidth;
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

    var PCFSizeslider = document.getElementById("PCFKernelSizeSlider");
    var PCFSize = PCFSizeslider.value * 2 + 1;
    document.getElementById('PCFKernelSizeDisplay').innerHTML = PCFSize + 'x' + PCFSize;
    PCFSizeslider.oninput = (e) => {
      this.SetPCFKernelSize(e.target.value * 2 + 1, this.GaussianWidth);
    }

    var PCFWidthSlider = document.getElementById("PCFGaussianWidthSlider");
    var PCFWidth = PCFWidthSlider.value / 10.0;
    document.getElementById('PCFGaussianWidthSlider').innerHTML = PCFWidth;
    PCFWidthSlider.oninput = (e) => {
      this.SetPCFKernelSize(this.PCFKernelSize, e.target.value / 10.0);
    }

    this.SetPCFKernelSize(PCFSize, PCFWidth);
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
    
    // Set uniform
    Program.setUniform1i('KernelSize', this.PCFKernelSize);
    Program.setUniform1f('KernelSum', this.PCFKernelSum);
    Program.setUniform1fv('Kernel', new Float32Array(this.PCFKernel));
    Program.setUniform1i('IsHorizontal', true);
  }

  // must be coupled with horizontal filter above
  bindPCFVertical() {
    // Unbind textures, call this first
    this.shadowFBO.bindForWriting();
    this.GaussianBlurFBO.bindForReading(0, 'InputSampler');

    gl.viewport(0, 0, this.shadowFBO.width, this.shadowFBO.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    Program.setUniform1i('IsHorizontal', false);
  }

  SetPCFKernelSize(_size, _width) {
    this.PCFKernelSize = _size ? _size : this.PCFKernelSize;
    this.GaussianWidth = _width ? _width : this.GaussianWidth;
    document.getElementById('PCFKernelSizeDisplay').innerHTML = this.PCFKernelSize + 'x' + this.PCFKernelSize;
    document.getElementById('PCFGaussianWidthDisplay').innerHTML = this.GaussianWidth;

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