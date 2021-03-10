class Utility {
  useNPR;
  showDebugView = false;
  selectedDebugGBufferIndex;
  selectedDebugCurvatureIndex;
  selectedDebugCurvatureVertexIndex;
  useForwardShading;
  PCFEnabled = true;
  shadowEnabled;
  shadowView = { value: false };
  shadowBias = { value: 0.0 };
  shadowExpScale = { value: 0.0 };
  totalTries = 0;
  hatchingSampleScale = { value: 0 };
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
  recomputeSmoothNormal;

  constructor() {
    // Prevent right click context menu
    document.getElementById('mainCanvas').addEventListener('contextmenu', e => {
      if (e.button === 2) {
        e.preventDefault();
      }
    })

    document.getElementById("DebugViewCheckbox").onclick = (e) => {
      if (this.showDebugView = e.target.checked) {
        document.getElementById('DebugBufferSelector').style.display = 'block';
      } else {
        document.getElementById('DebugBufferSelector').style.display = 'none';
      }
    }

    function styleChanged(checked) {
      if (checked) {
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
    this.useNPR = document.getElementById('shadingStyleCheckbox').checked;
    styleChanged(this.useNPR);
    document.getElementById("shadingStyleCheckbox").onclick = (e) => {
      this.useNPR = e.target.checked;
      styleChanged(this.useNPR);
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

    this.selectedDebugGBufferIndex = document.getElementById('debugViewOptions').selectedIndex;
    document.getElementById('debugViewOptions').onchange = (e) => {
      this.selectedDebugGBufferIndex = e.target.selectedIndex;
    }

    this.selectedDebugCurvatureIndex = document.getElementById('curvatureDebugViewOptions').selectedIndex;
    document.getElementById('curvatureDebugViewOptions').onchange = (e) => {
      this.selectedDebugCurvatureIndex = e.target.selectedIndex;
    }

    // Curvature view vertex index radio button group
    var CurvatureViewVertexRadios = document.getElementsByName('CurvatureViewVertexIndexRadioGroup');
    for (var i = 0, length = CurvatureViewVertexRadios.length; i < length; i++) {
      if (CurvatureViewVertexRadios[i].checked) {
        this.selectedDebugCurvatureVertexIndex = CurvatureViewVertexRadios[i].value;
      }

      CurvatureViewVertexRadios[i].onchange = (e) => {
        var radio = e.target;
        if (radio.checked) {
          this.selectedDebugCurvatureVertexIndex = radio.value;
        }
      }
    }

    document.getElementById("PCFFilterCheckbox").onclick = (e) => {
      this.PCFEnabled = e.target.checked;
      if (!this.PCFEnabled) {
        document.getElementById("PCFFilterDiv").style.display = 'none';
      } else {
        document.getElementById("PCFFilterDiv").style.display = 'block';
      }
    }

    this.shadowDisabled = document.getElementById('ShadowDisabledCheckbox').checked;
    document.getElementById('ShadowDiv').style.display = this.shadowDisabled ? 'none' : 'block';
    document.getElementById('ShadowDisabledCheckbox').onclick = (e) => {
      this.shadowDisabled = e.target.checked;
      document.getElementById('ShadowDiv').style.display = this.shadowDisabled ? 'none' : 'block';
    }

    this.setupNPRMutexCheckbox(this.normalSmoothingView, 'normalSmoothingCheckBox')
    this.setupNPRMutexCheckbox(this.curvatureView, 'curvatureViewCheckBox',
      () => {
        document.getElementById('CurvatureDebugBufferSelector').style.display = 'block';
        document.getElementById('CurvatureViewVertexRadioButtons').style.display = 'block';
      },
      () => {
        document.getElementById('CurvatureDebugBufferSelector').style.display = 'none';
        document.getElementById('CurvatureViewVertexRadioButtons').style.display = 'none';
      })
    this.setupNPRMutexCheckbox(this.contourView, 'viewContourCheckBox')
    this.setupNPRMutexCheckbox(this.hatchingView, 'viewHatchingCheckBox')

    this.setupStandaloneCheckbox(this.shadowView, 'ShadowViewCheckbox');
    this.setupStandaloneCheckbox(this.showSmoothedNormal, 'normalDebugShowSmoothedCheckBox');

    this.setupNumericalSlider(
      this.hatchingSampleScale,
      'hatchingSampleScaleSlider',
      'hatchingSampleScaleDisplay',
      (val) => { return val * 0.19 + 1 },
      (val) => { return val.toFixed(2) }
    );

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
      'maxSmoothAngleDisplay',
      (val) => { this.recomputeSmoothNormal = true; return val; }
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

  setupNPRMutexCheckbox(localVar, elementId, onChecked, onUnchecked) {
    localVar.value = document.getElementById(elementId).checked;
    document.getElementById(elementId).onclick = (e) => {
      if (e.target.checked) {
        this.closeAllMutualExclusiveViews();
        localVar.value = true;
        document.getElementById(elementId).checked = true;

        if (onChecked) onChecked();
      } else {
        localVar.value = false;
        if (onUnchecked) onUnchecked();
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

  GetCheckedRadioButton(RadioGroupName) {
    var CurvatureViewVertexRadios = document.getElementsByName(RadioGroupName);
    for (var i = 0, length = CurvatureViewVertexRadios.length; i < length; i++) {
      if (CurvatureViewVertexRadios[i].checked) {
        return i;
      }
    }

    return 0;
  }
}

var util = new Utility();

export { util };