import { gl } from './context.js';
import { Framebuffer, Framebuffer3D } from './framebuffer.js';
import { GBuffer } from './gbuffer.js';
import { Program } from './shader.js';
import { util } from './htmlUtil.js';
import { Texture2D } from './texture.js';

class Viewport {
  shadowFBO;
  gBuffer = new GBuffer();
  GaussianBlurFBO;
  screenSizeFBOs = [];
  PCFKernelSize;
  PCFKernel = [];
  PCFKernelSum;
  GaussianWidth;
  pencilHatchingFBO;
  hatchingRes;
  hatchingTexDepth;
  pencilStrokeTex;
  paperBackgroundDiff;
  paperBackgroundNorm;
  initialized = false;

  constructor(onLoad) {
    this.pencilStrokeTex = new Texture2D('./pencilStroke.png', () => {
      if (onLoad) onLoad();
    });

    this.paperBackgroundDiff = new Texture2D('./PaperBackgroundBaseColor.png', () => {
      if (onLoad) onLoad();
    });

    this.paperBackgroundNorm = new Texture2D('./PaperBackgroundNormal.png', () => {
      if (onLoad) onLoad();
    });

    // Initialize shadow fbo from html settings
    var shadowResElem = document.shadowResForm.shadowRes;
    for (let i = 0; i < shadowResElem.length; i++) {
      shadowResElem[i].onchange = (e) => {
        var shadowRes = e.target.value;
        this.shadowFBO.resize(shadowRes, shadowRes);
      }
    }
    var shadowRes = Number(shadowResElem.value);
    this.shadowFBO = new Framebuffer(shadowRes, shadowRes);
    this.GaussianBlurFBO = new Framebuffer(this.shadowFBO.width, this.shadowFBO.height);

    // Initialize hatching fbo from html settings
    var hatchingResElem = document.hatchingResForm.hatchingRes;
    for (let i = 0; i < hatchingResElem.length; i++) {
      hatchingResElem[i].onchange = (e) => {
        this.hatchingRes = e.target.value;
        this.pencilHatchingFBO.resize(this.hatchingRes, this.hatchingRes);
      }
    }
    this.hatchingRes = Number(hatchingResElem.value);
    this.pencilHatchingFBO = new Framebuffer3D(this.hatchingRes, this.hatchingRes);
    this.pencilHatchingFBO.resize(this.hatchingRes, this.hatchingRes);

    var hatchingTexDepthElem = document.getElementById("HatchingDepthSlider");
    this.hatchingTexDepth = hatchingTexDepthElem.value;
    document.getElementById('HatchingDepthDisplay').innerHTML = this.hatchingTexDepth;
    hatchingTexDepthElem.oninput = (e) => {
      this.hatchingTexDepth = e.target.value;
      document.getElementById('HatchingDepthDisplay').innerHTML = this.hatchingTexDepth;
    }

    var PCFSizeslider = document.getElementById("PCFKernelSizeSlider");
    var PCFSize = PCFSizeslider.value * 2 + 1;
    document.getElementById('PCFKernelSizeDisplay').innerHTML = PCFSize + 'x' + PCFSize;
    PCFSizeslider.oninput = (e) => {
      this.SetPCFKernelSize(e.target.value * 2 + 1, this.GaussianWidth);
    }

    var PCFWidthSlider = document.getElementById("PCFGaussianWidthSlider");
    var PCFWidth = PCFWidthSlider.value / 10.0;
    document.getElementById('PCFGaussianWidthDisplay').innerHTML = PCFWidth;
    PCFWidthSlider.oninput = (e) => {
      this.SetPCFKernelSize(this.PCFKernelSize, e.target.value / 10.0);
    }

    this.SetPCFKernelSize(PCFSize, PCFWidth);

    gl.cullFace(gl.BACK);
  }

  renderToDefault() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    return this;
  }

  renderToShadowMap() {
    this.shadowFBO.bindForWriting();
    gl.viewport(0, 0, this.shadowFBO.width, this.shadowFBO.height);
    return this;
  }

  renderToGBuffer() {
    this.gBuffer.bindForWriting();
    gl.viewport(0, 0, this.gBuffer.width, this.gBuffer.height);
    Program.setUniform2fv('OutputSize', new Float32Array([this.gBuffer.width, this.gBuffer.height]));

    this.paperBackgroundNorm.bind('BackgroundNormSampler', 11)

    Program.setUniform1f('PaperEffectWeight', util.paperNormalWeight.value);

    return this;
  }

  renderToHatchingBuffer() {
    this.pencilHatchingFBO.bindForWriting();

    gl.viewport(0, 0, this.pencilHatchingFBO.width, this.pencilHatchingFBO.height);

    this.pencilStrokeTex.bind('StrokeSampler', 0);

    Program.setUniform1f('SourceStrokeScale', util.srcStrokeIntensity.value);
    Program.setUniform1i('NumLinesToDraw', util.maxHatchingLines.value);
    Program.setUniform1f('AngleRange', util.strokeAngleRange.value);
    Program.setUniform2fv('OutputSize', new Float32Array([this.pencilHatchingFBO.width, this.pencilHatchingFBO.height]));
    Program.setUniform1f('StrokeWidth', util.strokeWidth.value);
    Program.setUniform1f('FirstStrokeBias', util.firstStrokeBias.value);

    return this;
  }

  renderToGenericFBO(index) {
    if (index == undefined) alert('Render to Generic FBO must be given a valid index');

    // check if fbo avaialble
    if (!this.screenSizeFBOs[index]) {
      this.screenSizeFBOs.push(new Framebuffer(gl.canvas.width, gl.canvas.height));
    }

    this.screenSizeFBOs[index].bindForWriting();

    // canvas size
    gl.viewport(0, 0, this.screenSizeFBOs[index].width, this.screenSizeFBOs[index].height);

    return this;
  }

  resizeViewport(left, bottom, width, height) {
    // use canvas if not specified
    gl.viewport(left ? left : 0, bottom ? bottom : 0, width ? width : gl.canvas.width, height ? height : gl.canvas.height);
    return this;
  }

  enableBlend(enable, blendRGB, blendAlpha, scaleSRGB, scaleDRGB) {
    if (enable) {
      gl.enable(gl.BLEND);
      gl.blendEquationSeparate(blendRGB ? blendRGB : gl.FUNC_ADD, blendAlpha ? blendAlpha : gl.FUNC_ADD);
      gl.blendFuncSeparate(scaleSRGB != undefined ? scaleSRGB : gl.ONE, scaleDRGB != undefined ? scaleDRGB : gl.ONE, gl.ONE, gl.ONE);
    }
    else gl.disable(gl.BLEND);
    return this;
  }

  enableFaceCull(enable) {
    if (enable) gl.enable(gl.CULL_FACE);
    else gl.disable(gl.CULL_FACE);
    return this;
  }

  enableDepthTest(enable) {
    if (enable) gl.enable(gl.DEPTH_TEST);
    else gl.disable(gl.DEPTH_TEST);
    return this;
  }

  clearFrame(R, G, B, A) {
    gl.clearColor(R ? R : 0.0, G ? G : 0.0, B ? B : 0.0, A ? A : 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    return this;
  }

  readGBuffer() {
    this.gBuffer.bindAllForReading();
    return this;
  }

  readShadowMap() {
    this.shadowFBO.bindForReading(8, 'ShadowSampler');
    return this;
  }

  readDebugBuffer() {
    this.gBuffer.bindDebugBuffer();
    return this;
  }

  readHatchingBuffer() {
    this.pencilHatchingFBO.bindForReading(10, 'HatchingSampler');

    Program.setUniform1i('NumHatchingSlices', this.hatchingTexDepth);
    Program.setUniform1f('HatchingSliceCoord', util.currentHatchingDepth.value);
    return this;
  }

  readGenericFBO(index) {
    if (!this.screenSizeFBOs[index]) {
      alert('Cannot read empty fbo, check your pipe!');
    }
    this.screenSizeFBOs[index].bindForReading(9, 'InputSampler');

    return this;
  }

  readBackground() {
    this.paperBackgroundDiff.bind('BackgroundDiffSampler', 11);

    Program.setUniform1f('PaperEffectWeight', util.paperDiffuseWeight.value);
    Program.setUniform1i('UsePaperDiffuse', util.usePaperDiffuse.value);
    Program.setUniform1i('UsePaperNormal', util.usePaperNormal.value);
    return this;
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

    // Set uniform
    Program.setUniform1i('KernelSize', this.PCFKernelSize);
    Program.setUniform1f('KernelSum', this.PCFKernelSum);
    Program.setUniform1fv('Kernel', new Float32Array(this.PCFKernel));
    Program.setUniform1i('IsHorizontal', true);

    return this;
  }

  // must be coupled with horizontal filter above
  bindPCFVertical() {
    // Unbind textures, call this first
    this.shadowFBO.bindForWriting();
    this.GaussianBlurFBO.bindForReading(0, 'InputSampler');

    gl.viewport(0, 0, this.shadowFBO.width, this.shadowFBO.height);

    Program.setUniform1i('IsHorizontal', false);

    return this;
  }

  showSmoothedNormal() {
    Program.setUniform1i('ShowSmoothed', util.showSmoothedNormal.value);
    return this;
  }

  // this is expected to be called only after normal deferred shading render pass

  bindCustomFBForDebug() {
    this.shadowFBO.bindForReading(0, 'DebugBufferSampler');
  }

  SetPCFKernelSize(_size, _width) {
    this.PCFKernelSize = _size ? _size : this.PCFKernelSize;
    this.GaussianWidth = _width ? _width : this.GaussianWidth;
    document.getElementById('PCFKernelSizeDisplay').innerHTML = this.PCFKernelSize + 'x' + this.PCFKernelSize;
    document.getElementById('PCFGaussianWidthDisplay').innerHTML = this.GaussianWidth;

    var exp = Math.pow(Math.E, -0.5 / this.GaussianWidth / this.GaussianWidth);
    this.PCFKernelSum = 0;
    for (let i = 0; i < this.PCFKernelSize; i++) {
      var distance = Math.floor(this.PCFKernelSize / 2) - i;
      this.PCFKernel[i] = Math.pow(exp, distance * distance);
      this.PCFKernelSum += this.PCFKernel[i];
    }
  }
}
export { Viewport };