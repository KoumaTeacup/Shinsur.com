class DebugTab {
  name;
  button;
  content;
  active = false;
  disabled = false;
  contentOverwriteIfDisabled;

  constructor(name) {
    this.name = name;
    this.setup();
    this.setupDisabledContent();
  }

  setup() {
    var buttonId = this.name + 'Button';
    var contentId = this.name + 'DebugMenu';

    this.button = document.getElementById(buttonId);
    this.content = document.getElementById(contentId);
    var _this = this;

    function ThisObj() {
      return _this;
    }

    Array.from(document.getElementsByClassName('tabLink')).forEach(buttonElem => {
      buttonElem.addEventListener('click', e => {
        if (buttonElem.id === buttonId) {
          if (_this.active) {
            return;
          }

          if (_this.disabled) {
            // Disabled
            _this.active = true;
            _this.disable();
          } else {
            // Clicked
            _this.active = true;
            _this.enable();
          }
        } else {
          // Other Tab Clicked
          _this.active = false;
          _this.button.className = _this.button.className.replace(' active', '');
          _this.content.style.display = 'none';
          _this.contentOverwriteIfDisabled.style.display = 'none';
        }
      })
    })
  }

  disable() {
    if (!this.disabled) {
      this.disabled = true;
      this.button.className += ' disabled';
      this.button.className = this.button.className.replace(' active', '');
    }

    // Don't change content if the tab is not active
    if (this.active) {
      this.content.style.display = 'none';
      if (this.contentOverwriteIfDisabled) {
        this.contentOverwriteIfDisabled.style.display = 'block';
      }
    }
  }

  enable() {
    if (this.disabled) {
      this.disabled = false;
      this.button.className = this.button.className.replace(' disabled', '');
    }

    // Don't change content if the tab is not active
    if (this.active) {
      this.button.className += ' active';
      this.content.style.display = 'block';
      if (this.contentOverwriteIfDisabled) {
        this.contentOverwriteIfDisabled.style.display = 'none';
      }
    }
  }

  setupDisabledContent() {
    switch (this.name) {
      case 'shadingMode':
        this.contentOverwriteIfDisabled = document.getElementById('pbrOnly');
        break;
      default:
        break;
    }
  }
}

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
  contourNumberOfLines = { value: 0 };
  contourRedrawPeriod = { value: 0.0 };
  contourRedrawAmplify = { value: 0.0 };
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
  usePaperDiffuse = { value: false };
  usePaperNormal = { value: false };
  paperDiffuseWeight = { value: 0.0 };
  paperNormalWeight = { value: 0.0 };

  constructor() {
    // Prevent right click context menu
    document.getElementById('mainCanvas').addEventListener('contextmenu', e => {
      if (e.button === 2) {
        e.preventDefault();
      }
    })

    var profileTab = new DebugTab('profile');
    var shadingModeTab = new DebugTab('shadingMode');
    var gBufferTab = new DebugTab('gBuffer');
    var shadowTab = new DebugTab('shadow');
    var normalTab= new DebugTab('normalSmooth');
    var curvatureTab= new DebugTab('curvature');
    var contourTab= new DebugTab('contour');
    var hatchingTab= new DebugTab('hatching');
    var paperTab= new DebugTab('paperEffect');

    function styleChanged(checked) {
      if (checked) {
        shadingModeTab.disable();
      } else {
        shadingModeTab.enable();
      }
    }

    document.getElementById("DebugViewCheckbox").onclick = (e) => {
      if (this.showDebugView = e.target.checked) {
        document.getElementById('DebugBufferSelector').style.display = 'block';
      } else {
        document.getElementById('DebugBufferSelector').style.display = 'none';
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
    this.setupStandaloneCheckbox(this.usePaperDiffuse, 'paperDiffuseCheckbox');
    this.setupStandaloneCheckbox(this.usePaperNormal, 'paperNormalCheckbox');

    this.setupNumericalSlider(
      this.contourNumberOfLines,
      'contourNumberLinesSlider',
      'contourNumberLinesDisplay'
    );

    this.setupNumericalSlider(
      this.contourRedrawPeriod,
      'contourRedrawPeriodSlider',
      'contourRedrawPeriodDisplay',
      (val) => { return val / 100.0 },
      (val) => { return val.toFixed(2) }
    );

    this.setupNumericalSlider(
      this.contourRedrawAmplify,
      'contourRedrawAmplifySlider',
      'contourRedrawAmplifyDisplay',
      (val) => { return val / 5000.0 + 0.001 },
      (val) => { return val.toFixed(4) }
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
      (val) => { return val / 100.0 },
      (val) => { return val.toFixed(2) }
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

    this.setupNumericalSlider(
      this.paperDiffuseWeight,
      'paperDiffuseWeightSlider',
      'paperDiffuseWeightDisplay',
      (val) => { return val / 100.0 }
    );

    this.setupNumericalSlider(
      this.paperNormalWeight,
      'paperNormalWeightSlider',
      'paperNormalWeightDisplay',
      (val) => { return val / 100.0 }
    );
  }

  setupDebugTabEvents(buttonId, contentId) {
    document.getElementById(buttonId).addEventListener('click', e => {
      Array.from(document.getElementsByClassName('tabLink')).forEach(button => {
        button.className = button.className.replace(' active', '')
      });
      Array.from(document.getElementsByClassName('debugTabContent')).forEach(content => {
        content.style.display = content.id == contentId ? 'block' : 'none';
      });
      e.currentTarget.className += ' active';
    });
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

  // Per Frame Tick
  update(deltaTime) {
    document.getElementById("fps").innerHTML = 'fps: ' + Math.trunc(1000 / deltaTime);

    // Triangles rendered, currently counting everything
    document.getElementById('triCount').innerHTML = 'Tries Drawn: ' + this.totalTries;
  }
}

var util = new Utility();

export { util };