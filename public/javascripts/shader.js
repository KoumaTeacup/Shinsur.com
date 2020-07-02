import { gl } from './context.js';
import { srcArray } from './shsrc.js';

class Shader {
  constructor(_type = gl.VERTEX_SHADER, _src = '') {
    this.type = _type;
    this.src = _src

    this.shader = gl.createShader(this.type);
    gl.shaderSource(this.shader, this.src);
    gl.compileShader(this.shader);
    if (!gl.getShaderParameter(this.shader, gl.COMPILE_STATUS)) {
      console.log(gl.getShaderInfoLog(this.shader));
      gl.deleteShader(this.shader);
    }
  }
}

class Program {
  constructor(_descName = '') {
    this.descName = _descName;
    for (var srcObj of srcArray) {
      if (srcObj.descName === this.descName) {
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

    // create program method
    this.program = gl.createProgram();
    gl.attachShader(this.program, this.vShader.shader);
    gl.attachShader(this.program, this.fShader.shader);
    gl.linkProgram(this.program);
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      console.log(gl.getProgramInfoLog(this.program));
      gl.deleteProgram(this.program);
    }
  }

  link() {
    gl.linkProgram(this.program);;
  }

  use() {
    gl.useProgram(this.program);
  }

  attriLoc(_descName) {
    return gl.getAttribLocation(this.program, _descName);
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