import { Renderer } from './humanityRenderer.js';

document.getElementsByClassName("debugInfoContainer")[0].style.display = 'none';
document.getElementById("NPRDividerBar").style.display = 'none';

var renderer = new Renderer();
function renderLoop(timestamp) {
  // program
  renderer.humanityProgram.use();
  // viewport
  renderer.viewport.renderToHumanityFBO()
    .enableBlend(false)
    .enableFaceCull(false)
    .enableDepthTest(false)
    .clearFrame(1, 1, 1, 1);
  // mesh
  renderer.humanityCanvas.draw();

  // program
  renderer.humanityOutputProgram.use();
  // viewport
  renderer.viewport.renderToDefault()
    .readHumanityFBO()
    .enableBlend(false)
    .enableFaceCull(false)
    .enableDepthTest(false)
    .clearFrame(1, 1, 1, 1);
  // mesh
  renderer.humanityCanvas.draw();
  // request next frame
  window.requestAnimationFrame(renderLoop);
}

window.requestAnimationFrame(renderLoop);