import { gl } from './context.js';
import { srcArray } from './shsrc.js';

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

  constructor(_descName = '') {
    this.name = _descName;

    // create shaders
    for (var srcObj of srcArray) {
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

    // set attribute location
    gl.bindAttribLocation(this.program, 0, 'a_position');
    gl.bindAttribLocation(this.program, 1, 'a_tangent');
    gl.bindAttribLocation(this.program, 2, 'a_normal');
    gl.bindAttribLocation(this.program, 3, 'a_uv');

    // link program
    gl.linkProgram(this.program);
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      console.log(gl.getProgramInfoLog(this.program));
      gl.deleteProgram(this.program);
    }

  }

  use() {
    gl.useProgram(this.program);
  }

  attriLoc(_descName) {
    return gl.getAttribLocation(this.program, _descName);
  }

  bindTexture2D(_descName = '', value) {
    var uniformLoc = gl.getUniformLocation(this.program, _descName);
    gl.uniform1i(uniformLoc, value);
  }

  bindUniform3fv(_descName = '', value) {
    var uniformLoc = gl.getUniformLocation(this.program, _descName);
    gl.uniform3fv(uniformLoc, value);
  }

  bindUniformMatrix4fv(_descName = '', value) {
    var uniformLoc = gl.getUniformLocation(this.program, _descName);
    gl.uniformMatrix4fv(uniformLoc, false, value);
  }
}

export { Program };