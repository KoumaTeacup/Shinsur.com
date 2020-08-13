class Utility {
  useNPR;
  showDebugView = false;
  slectedBufferIndex;
  useForwardShading;
  PCFEnabled = true;
  shadowView = { value: false };
  shadowBias = { value: 0.0 };
  shadowExpScale = { value: 0.0 };
  totalTries = 0;
  normalSmoothingView = { value: false };
  contourView = { value: false };
  hatchingView = { value: false };
  curvatureView = { value: false };
  currentHatchingDepth = { value: 0.0 };
  strokeWidth = { value: 0.0 };
  maxHatchingLines = { value: 0 };
  srcStrokeIntensity = { value: 0.0 };
  strokeAngleRange = { value: 0.0 };
  firstStrokeBias = { value: 0.0 };
  showSmoothedNormal = { value: false };
  maxSmoothAngle = { value: 0.0 };

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
        document.getElementById('curvatureViewSection').style.display = 'block';
      } else {
        document.getElementById('shadowSection').style.display = 'block';
        document.getElementById('shadingModeSection').style.display = 'block';
        document.getElementById('contourSection').style.display = 'none';
        document.getElementById('hatchingSection').style.display = 'none';
        document.getElementById('normalSmoothingSection').style.display = 'none';
        document.getElementById('curvatureViewSection').style.display = 'none';
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


    this.setupNPRMutexCheckbox(this.normalSmoothingView, 'normalSmoothingCheckBox')
    this.setupNPRMutexCheckbox(this.curvatureView, 'curvatureViewCheckBox')
    this.setupNPRMutexCheckbox(this.contourView, 'viewContourCheckBox')
    this.setupNPRMutexCheckbox(this.hatchingView, 'viewHatchingCheckBox')

    this.setupStandaloneCheckbox(this.shadowView, 'ShadowViewCheckbox');
    this.setupStandaloneCheckbox(this.showSmoothedNormal, 'normalDebugShowSmoothedCheckBox');

    document.getElementById("PCFFilterCheckbox").onclick = (e) => {
      this.PCFEnabled = e.target.checked;
      if (!this.PCFEnabled) {
        document.getElementById("PCFFilterDiv").style.display = 'none';
      } else {
        document.getElementById("PCFFilterDiv").style.display = 'block';
      }
    }

    this.setupNumericalSlider(
      this.shadowBias,
      'ShadowBiasSlider',
      'shadowBiasDisplay',
      (val) => { return Math.pow(0.85, 100 - val / 3.0) * 9.9 },
      (val) => { return val.toFixed(6) }
    );

    this.setupNumericalSlider(
      this.shadowExpScale,
      'ShadowExpScaleSlider',
      'ShadowExpScaleDisplay',
      (val) => { return val / 100.0 }
    );

    this.setupNumericalSlider(
      this.currentHatchingDepth,
      'CurrentHatchingDepthSlider',
      'CurrentHatchingDepthDisplay',
      (val) => { return val * (document.getElementById('HatchingDepthSlider').value - 1) / 100.0 + 1 },
      (val) => { return val.toFixed(2) }
    );

    this.setupNumericalSlider(
      this.maxHatchingLines,
      "MaxHatchingLinesSlider",
      'MaxHatchingLinesDisplay'
    )

    this.setupNumericalSlider(
      this.strokeWidth,
      "HatchingStrokeWidthSlider",
      'HatchingStrokeWidthDisplay',
      (val) => { return (Math.pow(10.0, (val - 50.0) / 50.0)).toFixed(2) }
    );

    this.setupNumericalSlider(
      this.srcStrokeIntensity,
      "SrcStrokeIntensitySlider",
      'SrcStrokeIntensityDisplay',
      (val) => { return val / 100.0 }
    );

    this.setupNumericalSlider(
      this.strokeAngleRange,
      "HatchingStrokeMaxAngleSlider",
      'HatchingStrokeMaxAngleDisplay',
      (val) => { return val * Math.PI / 1800.0 },
      (val) => { return (val / Math.PI * 180.0).toFixed(1) }
    );

    this.setupNumericalSlider(
      this.firstStrokeBias,
      "FirstStrokeBiasSlider",
      'FirstStrokeBiasDisplay',
      (val) => { return val / 100.0 }
    );

    this.setupNumericalSlider(
      this.maxSmoothAngle,
      "maxSmoothAngleSlider",
      'maxSmoothAngleDisplay'
    );
  }

  setupNumericalSlider(localVar, sliderId, displayId, preSaveFunc = (val) => { return val; }, preDisplayFunc = (val) => { return val; }) {
    var slider = document.getElementById(sliderId);
    localVar.value = preSaveFunc(slider.value);
    document.getElementById(displayId).innerHTML = preDisplayFunc(localVar.value);
    slider.oninput = (e) => {
      localVar.value = preSaveFunc(e.target.value);
      document.getElementById(displayId).innerHTML = preDisplayFunc(localVar.value);
    }
  }

  setupStandaloneCheckbox(localVar, elementId) {
    localVar.value = document.getElementById(elementId).checked;
    document.getElementById(elementId).onclick = (e) => {
      localVar.value = e.target.checked;
    }
  }

  setupNPRMutexCheckbox(localVar, elementId) {
    localVar.value = document.getElementById(elementId).checked;
    document.getElementById(elementId).onclick = (e) => {
      if (e.target.checked) {
        this.closeAllMutualExclusiveViews();
        localVar.value = true;
        document.getElementById(elementId).checked = true;
      }
    }
  }

  closeAllMutualExclusiveViews() {
    this.normalSmoothingView.value = false;
    document.getElementById('normalSmoothingCheckBox').checked = false;
    this.curvatureView.value = false;
    document.getElementById('curvatureViewCheckBox').checked = false;
    this.hatchingView.value = false;
    document.getElementById('viewHatchingCheckBox').checked = false;
    this.contourView.value = false;
    document.getElementById('viewContourCheckBox').checked = false;
  }
}

var util = new Utility();

export { util };