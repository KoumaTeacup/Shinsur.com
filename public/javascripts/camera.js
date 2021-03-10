import { canvas, gl } from './context.js';
import { Program } from './shader.js';
import * as vec2 from './gl-matrix/vec2.js';
import * as vec3 from './gl-matrix/vec3.js';
import * as mat4 from './gl-matrix/mat4.js';
import * as glMatrix from './gl-matrix/common.js';

class FocusCamera {
  // camera properties
  focus = vec3.fromValues(0.0, 5.0, 0.0);
  distance = 0.0;
  upAngle = 0.0;
  frontAngle = 0.0;
  up = vec3.fromValues(0.0, 1.0, 0.0);
  fov = 1.0;
  near = 0.001;
  far = 1000;
  height = 0.0;
  aspect = gl.canvas.width / gl.canvas.height;

  // camera contorl
  isLMBDown = false;
  isRMBDown = false;
  lastMousePos = vec2.fromValues(0.0, 0.0);

  constructor() {
    canvas.addEventListener('mousedown', (event) => {
      switch (event.button) {
        case 0: // LMB
          this.isLMBDown = true;
          break;
        case 1: // MMB
          break;
        case 2: // RMB
          this.isRMBDown = true;
          break;
        default:
          break;
      }

      this.lastMousePos[0] = event.clientX;
      this.lastMousePos[1] = event.clientY;
    });

    canvas.addEventListener('mouseup', (event) => {
      switch (event.button) {
        case 0: // LMB
          this.isLMBDown = false;
          break;
        case 1: // MMB
          break;
        case 2: // RMB
          this.isRMBDown = false;
          break;
        default:
          break;
      }
    });

    canvas.addEventListener('wheel', (event) => {
      event.preventDefault();
      this.distance += event.deltaY/100;
      this.distance = Math.min(100, Math.max(0, this.distance));
    });

    canvas.addEventListener('mouseout', (event) => {
      this.isLMBDown = false;
      this.isRMBDown = false;
    });

    canvas.addEventListener('mousemove', (event) => {
      if (this.isLMBDown) {
        var currPos = vec2.fromValues(event.clientX, event.clientY);
        var offsetX = currPos[0] - this.lastMousePos[0];
        var offsetY = currPos[1] - this.lastMousePos[1];
        this.upAngle -= offsetY
        this.upAngle = Math.min(90.0, Math.max(-90.0, this.upAngle));
        this.frontAngle -= offsetX;
        this.lastMousePos = currPos;
      }

      if (this.isRMBDown) {
        var currPos = vec2.fromValues(event.clientX, event.clientY);
        var offsetX = currPos[0] - this.lastMousePos[0];
        this.distance -= offsetX / 10;
        this.distance = Math.min(300, Math.max(0, this.distance));
        this.lastMousePos = currPos;
      }
    });
  }

  update() {
    // Compute view matrix, pos = focus + viewAngle * distance
    var vecZ = vec3.fromValues(0.0, 0.0, 1.0);
    vec3.rotateX(vecZ, vecZ, vec3.fromValues(0.0, 0.0, 0.0), glMatrix.toRadian(this.upAngle));
    vec3.rotateY(vecZ, vecZ, vec3.fromValues(0.0, 0.0, 0.0), glMatrix.toRadian(this.frontAngle));

    var pos = vec3.add([], this.focus, vec3.scale([], vecZ, this.distance));
    pos[1] += this.height;

    var matView = mat4.lookAt(
      [],
      pos,
      this.focus,
      this.up);

    // Compute projection matrix
    var matPorj = mat4.perspective(
      [],
      this.fov,
      this.aspect,
      this.near,
      this.far);

    // Set uniform
    Program.setUniformMatrix4fv('MatView', matView);
    Program.setUniformMatrix4fv('MatProj', matPorj);
    Program.setUniform3fv('CameraPos', pos);
  }
}

export { FocusCamera };