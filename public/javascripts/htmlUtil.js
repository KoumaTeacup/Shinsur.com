class Utility {
  showDebugView = false;
  SelectedBufferIndex = 0;
  useForwardShading = true;

  constructor() {
    document.getElementById("DebugViewCheckbox").onclick = (e) => {
      if (this.showDebugView = e.target.checked) {
        document.getElementsByClassName('styleHideable')[0].style.display = 'block';
      } else {
        document.getElementsByClassName('styleHideable')[0].style.display = 'none';
      }
    }

    document.getElementById("shadingModeCheckBox").onclick = (e) => {
      this.useForwardShading = !e.target.checked;
    }

    document.getElementById('debugViewOptions').onchange = (e) => {
      this.SelectedBufferIndex = e.target.selectedIndex;
    }
  }
}

var util = new Utility();

export { util };