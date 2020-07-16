class Utility {
  showDebugView = false;
  useForwardShading = true;

  constructor() {
    document.getElementById("debugFramebufferToggleButton").onclick = (e) => {
      console.log(e.target.id);
      if (e.target.id === 'debugFramebufferToggleButton') {
        this.showDebugView = !this.showDebugView;
      }
    }

    document.getElementById("shadingModeCheckBox").onclick = (e) => {
      this.useForwardShading = !e.target.checked;
    }
  }
}

export { Utility };