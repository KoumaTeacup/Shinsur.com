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
  if (util.shadowEnabled.value) {
    renderer.drawShadowPass(util.PCFEnabled.value);
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
      renderer.drawNPRContourShakingPass(true);
      break renderPasses;
    }
    
    if (util.useForwardShading.value) {
      // PBR Forward Shading
      renderer.drawPBRForward();
    } else {
      // PBR Deferred Shading
      renderer.drawPBRDeferredGeometryPass();
      renderer.drawPBRDeferredLightingPass();
    }
    // NPR Pencil Rendering
    renderer.drawNPRGeometryPass();
    renderer.drawNPRContourLightingPass();
    renderer.drawNPRContourShakingPass(false);
    renderer.drawNPRPencilLightingPass();

    // GBuffer View
    if (util.showDebugView.value) {
      renderer.drawGBufferDebugView();
    }
  }

  util.recomputeSmoothNormal = false;

  // request next frame
  window.requestAnimationFrame(renderLoop);
}

window.requestAnimationFrame(renderLoop);