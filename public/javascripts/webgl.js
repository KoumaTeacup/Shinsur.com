import { util } from './htmlUtil.js';
import { Renderer } from './renderer.js';

var lastTimestamp = 0;

var renderer = new Renderer();

function renderLoop(timestamp) {

  // update delta time
  var deltaTime = timestamp - lastTimestamp;
  lastTimestamp = timestamp;

  // Update html UI:
  util.update(deltaTime);

  // Update Shadow Map
  if (!util.shadowDisabled) {
    renderer.drawShadowPass(util.PCFEnabled);
  }

  // clear html per frame data
  util.totalTries = 0;

  renderPasses: {
    // Normal Smooth View
    if (util.normalSmoothingView.value) {
      renderer.drawNormalSmoothingView();
      break renderPasses;
    }

    // Curvature View
    if (util.curvatureView.value) {
      renderer.drawCurvatureView();
      break renderPasses;
    }

    // Hatching View
    if (util.hatchingView.value) {
      renderer.drawHatchingView();
      break renderPasses;
    }

    // Contour View
    if (util.contourView.value) {
      renderer.drawNPRGeometryPass();
      renderer.drawNPRContourLightingPass();
      renderer.drawNPRContourShakingPass();
      break renderPasses;
    }

    // PBR Forward Shading
    if (!util.useNPR && util.useForwardShading) {
      renderer.drawPBRForward();
    }

    // PBR Deferred Shading
    if (!util.useNPR && !util.useForwardShading) {
      renderer.drawPBRDeferredGeometryPass();
      renderer.drawPBRDeferredLightingPass();
    }

    // NPR Pencil Rendering
    if (util.useNPR) {
      renderer.drawNPRGeometryPass();
      renderer.drawNPRContourLightingPass();
      renderer.drawNPRContourShakingPass();
      renderer.drawNPRPencilLightingPass();
    }

    // GBuffer View
    if (util.showDebugView && !(util.useForwardShading && !util.useNPR)) {
      renderer.drawGBufferDebugView();
    }
  }

  util.recomputeSmoothNormal = false;

  // request next frame
  window.requestAnimationFrame(renderLoop);
}

window.requestAnimationFrame(renderLoop);