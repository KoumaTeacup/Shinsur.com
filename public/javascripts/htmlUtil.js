class Utility {
  useNPR = true;
  showDebugView = false;
  slectedBufferIndex = 0;
  useForwardShading = true;
  PCFEnabled = true;
  shadowView = false;
  shadowBias;
  shadowExpScale;

  constructor() {
    document.getElementById("DebugViewCheckbox").onclick = (e) => {
      if (this.showDebugView = e.target.checked) {
        document.getElementsByClassName('styleHideable')[0].style.display = 'block';
      } else {
        document.getElementsByClassName('styleHideable')[0].style.display = 'none';
      }
    }

    document.getElementById("shadingStyleCheckbox").onclick = (e) => {
      this.useNPR = e.target.checked;
    }

    document.getElementById("shadingModeCheckBox").onclick = (e) => {
      this.useForwardShading = !e.target.checked;
    }

    document.getElementById('debugViewOptions').onchange = (e) => {
      this.slectedBufferIndex = e.target.selectedIndex;
    }

    document.getElementById("ShadowViewCheckbox").onclick = (e) => {
      this.shadowView = e.target.checked;
    }

    document.getElementById("PCFFilterCheckbox").onclick = (e) => {
      this.PCFEnabled = e.target.checked;
      if (!this.PCFEnabled) {
        document.getElementById("PCFFilterDiv").style.display = 'none';
      } else {
        document.getElementById("PCFFilterDiv").style.display = 'block';
      }
    }

    var shadowBiasslider = document.getElementById("ShadowBiasSlider");
    this.shadowBias = Math.pow(0.85, 100 - shadowBiasslider.value / 3.0) * 9.9;
    document.getElementById('shadowBiasDisplay').innerHTML = this.shadowBias.toFixed(6);
    shadowBiasslider.oninput = (e) => {
      this.shadowBias = Math.pow(0.85, 100 - e.target.value / 3.0) * 9.9;
      document.getElementById('shadowBiasDisplay').innerHTML = this.shadowBias.toFixed(6);
    }

    var shadowExpScaleslider = document.getElementById("ShadowExpScaleSlider");
    this.shadowExpScale = shadowExpScaleslider.value / 100.0;
    document.getElementById('ShadowExpScaleDisplay').innerHTML = this.shadowExpScale;
    shadowExpScaleslider.oninput = (e) => {
      this.shadowExpScale = e.target.value / 100.0;
      document.getElementById('ShadowExpScaleDisplay').innerHTML = this.shadowExpScale;
    }
  }
}

var util = new Utility();

export { util };