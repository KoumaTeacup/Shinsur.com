class Utility {
  useNPR;
  showDebugView = false;
  slectedBufferIndex;
  useForwardShading;
  PCFEnabled = true;
  shadowView;
  shadowBias;
  shadowExpScale;
  totalTries = 0;
  hatchingView;
  currentHatchingDepth;

  constructor() {
    document.getElementById("DebugViewCheckbox").onclick = (e) => {
      if (this.showDebugView = e.target.checked) {
        document.getElementsByClassName('styleHideable')[0].style.display = 'block';
      } else {
        document.getElementsByClassName('styleHideable')[0].style.display = 'none';
      }
    }

    this.useNPR = document.getElementById('shadingStyleCheckbox').checked;
    document.getElementById("shadingStyleCheckbox").onclick = (e) => {
      this.useNPR = e.target.checked;
      if (this.useNPR) {
        document.getElementById('shadowSection').style.display = 'none';
        document.getElementById('shadingModeSection').style.display = 'none';
        document.getElementById('contourSection').style.display = 'block';
        document.getElementById('hatchingSection').style.display = 'block';
      } else {
        document.getElementById('shadowSection').style.display = 'block';
        document.getElementById('shadingModeSection').style.display = 'block';
        document.getElementById('contourSection').style.display = 'none';
        document.getElementById('hatchingSection').style.display = 'none';
      }
    }

    this.useForwardShading = !document.getElementById('shadingModeCheckBox').checked;
    document.getElementById("shadingModeCheckBox").onclick = (e) => {
      this.useForwardShading = !e.target.checked;
      if (this.useForwardShading) {
        document.getElementById('GbufferViewerSection').style.display = 'none';
      } else {
        document.getElementById('GbufferViewerSection').style.display = 'block';
      }
    }

    this.slectedBufferIndex = document.getElementById('debugViewOptions').selectedIndex;
    document.getElementById('debugViewOptions').onchange = (e) => {
      this.slectedBufferIndex = e.target.selectedIndex;
    }

    this.shadowView = document.getElementById('ShadowViewCheckbox').checked;
    document.getElementById("ShadowViewCheckbox").onclick = (e) => {
      this.shadowView = e.target.checked;
    }

    this.hatchingView = document.getElementById('viewHatchingCheckBox').checked;
    document.getElementById('viewHatchingCheckBox').onclick = (e) => {
      this.hatchingView = e.target.checked;
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

    var currentHatchingDepthSlider = document.getElementById("CurrentHatchingDepthSlider");
    this.currentHatchingDepth = currentHatchingDepthSlider.value * (document.getElementById('HatchingDepthSlider').value - 1) / 100.0 + 1;
    document.getElementById('CurrentHatchingDepthDisplay').innerHTML = this.currentHatchingDepth.toFixed(2);
    currentHatchingDepthSlider.oninput = (e) => {
      this.currentHatchingDepth = e.target.value * (document.getElementById('HatchingDepthSlider').value - 1) / 100.0 + 1;
      document.getElementById('CurrentHatchingDepthDisplay').innerHTML = this.currentHatchingDepth.toFixed(2);
    }
  }
}

var util = new Utility();

export { util };