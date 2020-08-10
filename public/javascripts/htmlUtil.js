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
  normalSmoothingView;
  contourView;
  hatchingView;
  currentHatchingDepth;
  strokeWidth;
  maxHatchingLines;
  srcStrokeIntensity;
  strokeAngleRange;
  firstStrokeBias;
  showSmoothedNormal;
  maxSmoothAngle;

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
        document.getElementById('normalSmoothingSection').style.display = 'block';
      } else {
        document.getElementById('shadowSection').style.display = 'block';
        document.getElementById('shadingModeSection').style.display = 'block';
        document.getElementById('contourSection').style.display = 'none';
        document.getElementById('hatchingSection').style.display = 'none';
        document.getElementById('normalSmoothingSection').style.display = 'none';
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

    this.normalSmoothingView = document.getElementById('normalSmoothingCheckBox').checked;
    document.getElementById('normalSmoothingCheckBox').onclick = (e) => {
      this.normalSmoothingView = e.target.checked;
      this.hatchingView = !e.target.checked;
      document.getElementById('viewHatchingCheckBox').checked = false;
      this.contourView = !e.target.checked;
      document.getElementById('viewContourCheckBox').checked = false;
    }

    this.showSmoothedNormal = document.getElementById('normalDebugShowSmoothedCheckBox').checked;
    document.getElementById('normalDebugShowSmoothedCheckBox').onclick = (e) => {
      this.showSmoothedNormal = e.target.checked;
    }

    this.contourView = document.getElementById('viewContourCheckBox').checked;
    document.getElementById('viewContourCheckBox').onclick = (e) => {
      this.contourView = e.target.checked;
      this.hatchingView = !e.target.checked;
      document.getElementById('viewHatchingCheckBox').checked = false;
      this.normalSmoothingView = !e.target.checked;
      document.getElementById('normalSmoothingCheckBox').checked = false;
    }

    this.hatchingView = document.getElementById('viewHatchingCheckBox').checked;
    document.getElementById('viewHatchingCheckBox').onclick = (e) => {
      this.hatchingView = e.target.checked;
      this.normalSmoothingView = !e.target.checked;
      document.getElementById('viewContourCheckBox').checked = false;
      this.contourView = !e.target.checked;
      document.getElementById('normalSmoothingCheckBox').checked = false;
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

    var maxHatchingLinesSlider = document.getElementById("MaxHatchingLinesSlider");
    this.maxHatchingLines = maxHatchingLinesSlider.value;
    document.getElementById('MaxHatchingLinesDisplay').innerHTML = this.maxHatchingLines;
    maxHatchingLinesSlider.oninput = (e) => {
      this.maxHatchingLines = e.target.value;
      document.getElementById('MaxHatchingLinesDisplay').innerHTML = this.maxHatchingLines;
    }

    var hatchingStrokeWidthSlider = document.getElementById("HatchingStrokeWidthSlider");
    this.strokeWidth = (Math.pow(10.0, (hatchingStrokeWidthSlider.value - 50.0) / 50.0)).toFixed(2);
    document.getElementById('HatchingStrokeWidthDisplay').innerHTML = this.strokeWidth;
    hatchingStrokeWidthSlider.oninput = (e) => {
      this.strokeWidth = (Math.pow(10.0, (e.target.value - 50.0) / 50.0)).toFixed(2);
      document.getElementById('HatchingStrokeWidthDisplay').innerHTML = this.strokeWidth;
    }

    var srcStrokeIntensitySlider = document.getElementById("SrcStrokeIntensitySlider");
    this.srcStrokeIntensity = srcStrokeIntensitySlider.value / 100.0;
    document.getElementById('SrcStrokeIntensityDisplay').innerHTML = this.srcStrokeIntensity;
    srcStrokeIntensitySlider.oninput = (e) => {
      this.srcStrokeIntensity = e.target.value / 100.0;
      document.getElementById('SrcStrokeIntensityDisplay').innerHTML = this.srcStrokeIntensity;
    }

    var hatchingStrokeMaxAngleSlider = document.getElementById("HatchingStrokeMaxAngleSlider");
    this.strokeAngleRange = hatchingStrokeMaxAngleSlider.value * Math.PI / 1800.0;
    document.getElementById('HatchingStrokeMaxAngleDisplay').innerHTML = (this.strokeAngleRange / Math.PI * 180.0).toFixed(1);
    hatchingStrokeMaxAngleSlider.oninput = (e) => {
      this.strokeAngleRange = e.target.value * Math.PI / 1800.0;
      document.getElementById('HatchingStrokeMaxAngleDisplay').innerHTML = (this.strokeAngleRange / Math.PI * 180.0).toFixed(1);
    }

    var firstStrokeBiasSlider = document.getElementById("FirstStrokeBiasSlider");
    this.firstStrokeBias = firstStrokeBiasSlider.value / 100.0;
    document.getElementById('FirstStrokeBiasDisplay').innerHTML = this.firstStrokeBias;
    firstStrokeBiasSlider.oninput = (e) => {
      this.firstStrokeBias = e.target.value / 100.0;
      document.getElementById('FirstStrokeBiasDisplay').innerHTML = this.firstStrokeBias;
    }

    var maxSmoothAngleSlider = document.getElementById("maxSmoothAngleSlider");
    this.maxSmoothAngle = maxSmoothAngleSlider.value;
    document.getElementById('maxSmoothAngleDisplay').innerHTML = this.maxSmoothAngle;
    maxSmoothAngleSlider.oninput = (e) => {
      this.maxSmoothAngle = e.target.value;
      document.getElementById('maxSmoothAngleDisplay').innerHTML = this.maxSmoothAngle;
    }
  }
}

var util = new Utility();

export { util };