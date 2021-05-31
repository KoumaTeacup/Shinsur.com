class DebugTab {
  name;
  button;
  content;
  active = false;
  disabled = false;

  constructor(name) {
    this.name = name;
    this.setup();
  }

  setup() {
    var buttonId = this.name + 'Button';
    var contentId = this.name + 'DebugMenu';

    this.button = document.getElementById(buttonId);
    this.content = document.getElementById(contentId);
    var _this = this;

    Array.from(document.getElementsByClassName('tabLink')).forEach(buttonElem => {
      buttonElem.addEventListener('click', e => {
        if (buttonElem.id === buttonId) {
          _this.onClicked();
        } else {
          // Other Tab Clicked
          _this.active = false;
          _this.button.className = _this.button.className.replace(' active', '');
          _this.content.style.display = 'none';
        }
      })
    })
  }

  disable() {
    if (this.disabled) {
      return;
    }

    this.disabled = true;
    this.button.className += ' disabled';
    this.content.className += ' disabled';
  }

  enable() {
    if (!this.disabled) {
      return;
    }

    this.disabled = false;
    this.button.className = this.button.className.replace(' disabled', '');
    this.content.className = this.content.className.replace(' disabled', '');
  }

  onClicked() {
    if (this.active) {
      return;
    }

    this.active = true;
    this.button.className += ' active';
    this.content.style.display = 'block';
  }
}

class Utility {
  NPRSlider = { value: 0 };
  showDebugView = { value: false };
  selectedDebugGBufferIndex;
  selectedDebugCurvatureIndex;
  selectedDebugCurvatureVertexIndex;
  useForwardShading = { value: false };
  PCFEnabled = { value: true };
  shadowEnabled = { value: true };
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
    var mainCanvas = document.getElementById('mainCanvas');
    mainCanvas.addEventListener('contextmenu', e => {
      if (e.button === 2) {
        e.preventDefault();
      }
    })

    // Debug tab buttons
    var profileTab = new DebugTab('profile');
    var shadingModeTab = new DebugTab('shadingMode');
    var gBufferTab = new DebugTab('gBuffer');
    var shadowTab = new DebugTab('shadow');
    var normalTab = new DebugTab('normalSmooth');
    var curvatureTab = new DebugTab('curvature');
    var contourTab = new DebugTab('contour');
    var hatchingTab = new DebugTab('hatching');
    var paperTab = new DebugTab('paperEffect');


    // GBuffer drop down menu
    var gBufferTypes = document.gBufferTypeForm.gBufferType;
    this.selectedDebugGBufferIndex = +gBufferTypes.value;
    for (let i = 0; i < gBufferTypes.length; i++) {
      gBufferTypes[i].addEventListener('click', e => {
        this.selectedDebugGBufferIndex = +e.target.value;
      });
    }

    // Curvature debug drop down menu
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

    // Before-after slider of canvas
    var NPRHandleMouseDown = false;
    var NPRDivider = document.getElementById('NPRDividerBar');
    NPRDivider.addEventListener('mousedown', e => {
      NPRHandleMouseDown = true;
    });

    document.addEventListener('mouseup', e => {
      NPRHandleMouseDown = false;
    });

    this.NPRSlider.value = (NPRDivider.offsetLeft - mainCanvas.offsetLeft);
    document.addEventListener('mousemove', e => {
      if (NPRHandleMouseDown) {
        var leftPercent = (e.pageX - mainCanvas.offsetLeft+3) / mainCanvas.offsetWidth;
        leftPercent = Math.max(0, leftPercent);
        leftPercent = Math.min(1, leftPercent);
        NPRDivider.style.left = leftPercent * 100.0 + '%';
        this.NPRSlider.value = leftPercent * mainCanvas.offsetWidth;
      }
    })

    // Checkboxes
    this.setupCheckbox(this.shadowView, 'ShadowViewCheckbox', true);
    this.setupCheckbox(this.normalSmoothingView, 'normalSmoothingCheckBox', true)
    this.setupCheckbox(this.curvatureView, 'curvatureViewCheckBox', true, 'curvatureOptional');
    this.setupCheckbox(this.contourView, 'viewContourCheckBox', true)
    this.setupCheckbox(this.hatchingView, 'viewHatchingCheckBox', true, 'hatchingOptional');

    this.setupCheckbox(this.useForwardShading, 'shadingModeCheckBox', false);
    this.setupCheckbox(this.showDebugView, 'DebugViewCheckbox', false, 'gBufferOptional');
    this.setupCheckbox(this.shadowEnabled, 'ShadowEnabledCheckbox', false, 'shadowOptional');
    this.setupCheckbox(this.showSmoothedNormal, 'normalDebugShowSmoothedCheckBox', false);
    this.setupCheckbox(this.usePaperDiffuse, 'paperDiffuseCheckbox', false);
    this.setupCheckbox(this.usePaperNormal, 'paperNormalCheckbox', false);
    this.setupCheckbox(this.PCFEnabled, 'PCFFilterCheckbox', false, 'PCFFilterOptional');

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

  // Helper functions
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
    if(displayId) document.getElementById(displayId).innerHTML = preDisplayFunc(localVar.value);
    slider.oninput = (e) => {
      localVar.value = preSaveFunc(e.target.value);
      if (displayId) document.getElementById(displayId).innerHTML = preDisplayFunc(localVar.value);
    }
  }

  setupCheckbox(localVar, elementId, isMutex, optionalId) {
    localVar.value = document.getElementById(elementId).checked;
    document.getElementById(elementId).addEventListener('click', e => {
      if (e.target.checked) {
        if (isMutex) {
          this.closeAllMutualExclusiveViews();
          e.target.checked = true;
          this.hideNPRSlider(true);
        }
        localVar.value = true;
        if (optionalId) {
          document.getElementById(optionalId).className = document.getElementById(optionalId).className.replace(/ off/g, '');
        }
      } else {
        localVar.value = false;
        if (optionalId) {
          document.getElementById(optionalId).className += ' off';
        }
        if (isMutex) {
          this.hideNPRSlider(false);
        }
      }
    })
  }

  closeAllMutualExclusiveViews() {
    this.shadowView.value = false;
    document.getElementById('ShadowViewCheckbox').checked = false;
    this.normalSmoothingView.value = false;
    document.getElementById('normalSmoothingCheckBox').checked = false;
    this.curvatureView.value = false;
    document.getElementById('curvatureViewCheckBox').checked = false;
    document.getElementById('curvatureOptional').className += ' off';
    this.hatchingView.value = false;
    document.getElementById('viewHatchingCheckBox').checked = false;
    document.getElementById('hatchingOptional').className += ' off';
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

  hideNPRSlider(hide) {
    document.getElementById('NPRDividerBar').style.display = hide || this.shadowView.value ? 'none' : 'block';
    var test = document.getElementById('NPRDividerBar').style.display;
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