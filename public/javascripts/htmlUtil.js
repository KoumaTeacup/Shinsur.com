class Utility {
  showDebugView = false;
  SelectedBufferIndex = 0;
  useForwardShading = true;
  shadowView = false;
  shadowBias = 0.01;

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

    document.getElementById("ShadowViewCheckbox").onclick = (e) => {
      this.shadowView = e.target.checked;
    }

    var slider = document.getElementById("shadowBiasRange");
    this.shadowBias = Math.pow(0.85, 100 - slider.value) * 9.9;
    document.getElementById('shadowBiasDisplay').innerHTML = this.shadowBias.toFixed(6);
    slider.oninput = (e) => {
      this.shadowBias = Math.pow(0.85, 100 - e.target.value) * 9.9;
      document.getElementById('shadowBiasDisplay').innerHTML = this.shadowBias.toFixed(6);
    }
  }
}

var util = new Utility();

export { util };