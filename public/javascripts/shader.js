import { gl } from './context.js';
import { srcArray } from './shsrc.js';
import { util } from './htmlUtil.js';

class Shader {
  shader;

  constructor(_type = gl.VERTEX_SHADER, _src = '') {
    this.shader = gl.createShader(_type);
    gl.shaderSource(this.shader, _src);
    gl.compileShader(this.shader);
    if (!gl.getShaderParameter(this.shader, gl.COMPILE_STATUS)) {
      console.log(gl.getShaderInfoLog(this.shader));
      gl.deleteShader(this.shader);
    }
  }
}

class Program {
  name;
  vShader;
  fShader;
  program;
  static currentShader = 0;

  constructor(_descName = '') {
    this.name = _descName;

    // create shaders
    for (let srcObj of srcArray) {
      if (srcObj.descName === this.name) {
        switch (srcObj.type) {
          case 'vert':
            this.vShader = new Shader(gl.VERTEX_SHADER, srcObj.data);
            break;
          case 'frag':
            this.fShader = new Shader(gl.FRAGMENT_SHADER, srcObj.data);
            break;
          default:
            console.log('Shader import failed, must be either vertex or fragment shader.');
            break;
        }
      }
    }

    // create program
    this.program = gl.createProgram();
    gl.attachShader(this.program, this.vShader.shader);
    gl.attachShader(this.program, this.fShader.shader);

    // set attribute location, max 16
    gl.bindAttribLocation(this.program, 0, 'a_position');
    gl.bindAttribLocation(this.program, 1, 'a_tangent');
    gl.bindAttribLocation(this.program, 2, 'a_normal');
    gl.bindAttribLocation(this.program, 3, 'a_uv');
    gl.bindAttribLocation(this.program, 4, 'a_snormal');
    gl.bindAttribLocation(this.program, 5, 'a_curvature');

    // link program
    gl.linkProgram(this.program);
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      console.log(gl.getProgramInfoLog(this.program));
      gl.deleteProgram(this.program);
    }

  }

  use() {
    Program.currentShader = this.program;
    gl.useProgram(this.program);

    // Bind some global render settings automatically
    var uniformLoc = gl.getUniformLocation(this.program, 'ShadowBias');
    gl.uniform1f(uniformLoc, util.shadowBias.value);
    var uniformLoc = gl.getUniformLocation(this.program, 'ShadowView');
    gl.uniform1i(uniformLoc, util.shadowView.value);
    var uniformLoc = gl.getUniformLocation(this.program, 'ShadowExpScale');
    gl.uniform1f(uniformLoc, util.shadowExpScale.value);
  }

  static setUniform1f(_uniform, _value) {
    if (!Program.currentShader) alert('No shader bound, this should never happen!');
    var loc = gl.getUniformLocation(this.currentShader, _uniform);
    if (loc) gl.uniform1f(loc, _value);
  }
  static setUniform1i(_uniform, _value) {
    if (!Program.currentShader) alert('No shader bound, this should never happen!');
    var loc = gl.getUniformLocation(this.currentShader, _uniform);
    if (loc) gl.uniform1i(loc, _value);
  }
  static setUniform1fv(_uniform, _value) {
    if (!Program.currentShader) alert('No shader bound, this should never happen!');
    var loc = gl.getUniformLocation(this.currentShader, _uniform);
    if (loc) gl.uniform1fv(loc, _value);
  }
  static setUniform1iv(_uniform, _value) {
    if (!Program.currentShader) alert('No shader bound, this should never happen!');
    var loc = gl.getUniformLocation(this.currentShader, _uniform);
    if (loc) gl.uniform1iv(loc, _value);
  }
  static setUniform2fv(_uniform, _value) {
    if (!Program.currentShader) alert('No shader bound, this should never happen!');
    var loc = gl.getUniformLocation(this.currentShader, _uniform);
    if (loc) gl.uniform2fv(loc, _value);
  }
  static setUniform3fv(_uniform, _value) {
    if (!Program.currentShader) alert('No shader bound, this should never happen!');
    var loc = gl.getUniformLocation(this.currentShader, _uniform);
    if (loc) gl.uniform3fv(loc, _value);
  }
  static setUniform4fv(_uniform, _value) {
    if (!Program.currentShader) alert('No shader bound, this should never happen!');
    var loc = gl.getUniformLocation(this.currentShader, _uniform);
    if (loc) gl.uniform4fv(loc, _value);
  }
  static setUniformMatrix4fv(_uniform, _value) {
    if (!Program.currentShader) alert('No shader bound, this should never happen!');
    var loc = gl.getUniformLocation(this.currentShader, _uniform);
    if (loc) gl.uniformMatrix4fv(loc, false, _value);
  }
}

export { Program };