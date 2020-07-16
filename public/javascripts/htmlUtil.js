class Utility {
  showDebugView = false;
  useForwardShading = true;

  constructor() {
    document.getElementById("debugFramebufferToggleButton").onclick = () => {
      this.showDebugView = !this.showDebugView;
    }

    document.getElementById("forwardShadingToggleButton").onclick = () => {
      this.useForwardShading = !this.useForwardShading;
    }
  }
}

export { Utility };