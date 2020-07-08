import { Program } from './shader.js';
import * as mat4 from './gl-matrix/mat4.js';
import { gl } from './context.js';
import { Texture2D } from './texture.js';

// actually create program
var defaultProg = new Program('default');

// attribute
var positionAttributeLocation = gl.getAttribLocation(defaultProg.program, "a_position");

var tex = new Texture2D('./Tifa.jpg');

// Use program to set uniform
gl.useProgram(defaultProg.program);

var numVertices = 24;
var vertexSize = 20;
var buf = new ArrayBuffer(numVertices * vertexSize);
const dv = new DataView(buf);
{
  //front face - left bottom - 0
  dv.setFloat32(0, -0.5, true);
  dv.setFloat32(4, -0.5, true);
  dv.setFloat32(8, 0.5, true);
  dv.setInt8(12, 0 * 0x7F);
  dv.setInt8(13, 0 * 0x7F);
  dv.setInt8(14, 1 * 0x7F);
  dv.setInt8(15, 0 * 0x7F);
  dv.setUint16(16, 0 * 0xFFFF);
  dv.setUint16(18, 0 * 0xFFFF);

  //front face - left top - 1
  dv.setFloat32(20, -0.5, true);
  dv.setFloat32(24, 0.5, true);
  dv.setFloat32(28, 0.5, true);
  dv.setInt8(32, 0 * 0x7F);
  dv.setInt8(33, 0 * 0x7F);
  dv.setInt8(34, 1 * 0x7F);
  dv.setInt8(35, 0 * 0x7F);
  dv.setUint16(36, 0 * 0xFFFF);
  dv.setUint16(38, 1 * 0xFFFF);

  //front face - right bottom - 2
  dv.setFloat32(40, 0.5, true);
  dv.setFloat32(44, -0.5, true);
  dv.setFloat32(48, 0.5, true);
  dv.setInt8(52, 0 * 0x7F);
  dv.setInt8(53, 0 * 0x7F);
  dv.setInt8(54, 1 * 0x7F);
  dv.setInt8(55, 0 * 0x7F);
  dv.setUint16(56, 1 * 0xFFFF);
  dv.setUint16(58, 0 * 0xFFFF);

  //front face - right top - 3
  dv.setFloat32(60, 0.5, true);
  dv.setFloat32(64, 0.5, true);
  dv.setFloat32(68, 0.5, true);
  dv.setInt8(72, 0 * 0x7F);
  dv.setInt8(73, 0 * 0x7F);
  dv.setInt8(74, 1 * 0x7F);
  dv.setInt8(75, 0 * 0x7F);
  dv.setUint16(76, 1 * 0xFFFF);
  dv.setUint16(78, 1 * 0xFFFF);

  //right face - left bottom - 4
  dv.setFloat32(80, 0.5, true);
  dv.setFloat32(84, -0.5, true);
  dv.setFloat32(88, 0.5, true);
  dv.setInt8(92, 1 * 0x7F);
  dv.setInt8(93, 0 * 0x7F);
  dv.setInt8(94, 0 * 0x7F);
  dv.setInt8(95, 0 * 0x7F);
  dv.setUint16(96, 0 * 0xFFFF);
  dv.setUint16(98, 0 * 0xFFFF);

  //right face - left top - 5
  dv.setFloat32(100, 0.5, true);
  dv.setFloat32(104, 0.5, true);
  dv.setFloat32(108, 0.5, true);
  dv.setInt8(112, 1 * 0x7F);
  dv.setInt8(113, 0 * 0x7F);
  dv.setInt8(114, 0 * 0x7F);
  dv.setInt8(115, 0 * 0x7F);
  dv.setUint16(116, 0 * 0xFFFF);
  dv.setUint16(118, 1 * 0xFFFF);

  //right face - right bottom - 6
  dv.setFloat32(120, 0.5, true);
  dv.setFloat32(124, -0.5, true);
  dv.setFloat32(128, -0.5, true);
  dv.setInt8(132, 1 * 0x7F);
  dv.setInt8(133, 0 * 0x7F);
  dv.setInt8(134, 0 * 0x7F);
  dv.setInt8(135, 0 * 0x7F);
  dv.setUint16(136, 1 * 0xFFFF);
  dv.setUint16(138, 0 * 0xFFFF);

  //right face - right top - 7
  dv.setFloat32(140, 0.5, true);
  dv.setFloat32(144, 0.5, true);
  dv.setFloat32(148, -0.5, true);
  dv.setInt8(152, 1 * 0x7F);
  dv.setInt8(153, 0 * 0x7F);
  dv.setInt8(154, 0 * 0x7F);
  dv.setInt8(155, 0 * 0x7F);
  dv.setUint16(156, 1 * 0xFFFF);
  dv.setUint16(158, 1 * 0xFFFF);

  //left face - left bottom - 8
  dv.setFloat32(160, -0.5, true);
  dv.setFloat32(164, -0.5, true);
  dv.setFloat32(168, -0.5, true);
  dv.setInt8(172, -1 * 0x7F);
  dv.setInt8(173, 0 * 0x7F);
  dv.setInt8(174, 0 * 0x7F);
  dv.setInt8(175, 0 * 0x7F);
  dv.setUint16(176, 0 * 0xFFFF);
  dv.setUint16(178, 0 * 0xFFFF);

  //left face - left top - 9
  dv.setFloat32(180, -0.5, true);
  dv.setFloat32(184, 0.5, true);
  dv.setFloat32(188, -0.5, true);
  dv.setInt8(192, -1 * 0x7F);
  dv.setInt8(193, 0 * 0x7F);
  dv.setInt8(194, 0 * 0x7F);
  dv.setInt8(195, 0 * 0x7F);
  dv.setUint16(196, 0 * 0xFFFF);
  dv.setUint16(198, 1 * 0xFFFF);

  //left face - right bottom - 10
  dv.setFloat32(200, -0.5, true);
  dv.setFloat32(204, -0.5, true);
  dv.setFloat32(208, 0.5, true);
  dv.setInt8(212, -1 * 0x7F);
  dv.setInt8(213, 0 * 0x7F);
  dv.setInt8(214, 0 * 0x7F);
  dv.setInt8(215, 0 * 0x7F);
  dv.setUint16(216, 1 * 0xFFFF);
  dv.setUint16(218, 0 * 0xFFFF);

  //left face - right top - 11
  dv.setFloat32(220, -0.5, true);
  dv.setFloat32(224, 0.5, true);
  dv.setFloat32(228, 0.5, true);
  dv.setInt8(232, -1 * 0x7F);
  dv.setInt8(233, 0 * 0x7F);
  dv.setInt8(234, 0 * 0x7F);
  dv.setInt8(235, 0 * 0x7F);
  dv.setUint16(236, 1 * 0xFFFF);
  dv.setUint16(238, 1 * 0xFFFF);

  //back face - left bottom - 12
  dv.setFloat32(240, 0.5, true);
  dv.setFloat32(244, -0.5, true);
  dv.setFloat32(248, -0.5, true);
  dv.setInt8(252, 0 * 0x7F);
  dv.setInt8(253, 0 * 0x7F);
  dv.setInt8(254, -1 * 0x7F);
  dv.setInt8(255, 0 * 0x7F);
  dv.setUint16(256, 0 * 0xFFFF);
  dv.setUint16(258, 0 * 0xFFFF);

  //back face - left top - 13
  dv.setFloat32(260, 0.5, true);
  dv.setFloat32(264, 0.5, true);
  dv.setFloat32(268, -0.5, true);
  dv.setInt8(272, 0 * 0x7F);
  dv.setInt8(273, 0 * 0x7F);
  dv.setInt8(274, -1 * 0x7F);
  dv.setInt8(275, 0 * 0x7F);
  dv.setUint16(276, 0 * 0xFFFF);
  dv.setUint16(278, 1 * 0xFFFF);

  //back face - right bottom - 14
  dv.setFloat32(280, -0.5, true);
  dv.setFloat32(284, -0.5, true);
  dv.setFloat32(288, -0.5, true);
  dv.setInt8(292, 0 * 0x7F);
  dv.setInt8(293, 0 * 0x7F);
  dv.setInt8(294, -1 * 0x7F);
  dv.setInt8(295, 0 * 0x7F);
  dv.setUint16(296, 1 * 0xFFFF);
  dv.setUint16(298, 0 * 0xFFFF);

  //back face - right top - 15
  dv.setFloat32(300, -0.5, true);
  dv.setFloat32(304, 0.5, true);
  dv.setFloat32(308, -0.5, true);
  dv.setInt8(312, 0 * 0x7F);
  dv.setInt8(313, 0 * 0x7F);
  dv.setInt8(314, -1 * 0x7F);
  dv.setInt8(315, 0 * 0x7F);
  dv.setUint16(316, 1 * 0xFFFF);
  dv.setUint16(318, 1 * 0xFFFF);

  //top face - left bottom - 16
  dv.setFloat32(320, -0.5, true);
  dv.setFloat32(324, 0.5, true);
  dv.setFloat32(328, 0.5, true);
  dv.setInt8(332, 0 * 0x7F);
  dv.setInt8(333, 1 * 0x7F);
  dv.setInt8(334, 0 * 0x7F);
  dv.setInt8(335, 0 * 0x7F);
  dv.setUint16(336, 0 * 0xFFFF);
  dv.setUint16(338, 0 * 0xFFFF);

  //top face - left top - 17
  dv.setFloat32(340, -0.5, true);
  dv.setFloat32(344, 0.5, true);
  dv.setFloat32(348, -0.5, true);
  dv.setInt8(352, 0 * 0x7F);
  dv.setInt8(353, 1 * 0x7F);
  dv.setInt8(354, 0 * 0x7F);
  dv.setInt8(355, 0 * 0x7F);
  dv.setUint16(356, 0 * 0xFFFF);
  dv.setUint16(358, 1 * 0xFFFF);

  //top face - right bottom - 18
  dv.setFloat32(360, 0.5, true);
  dv.setFloat32(364, 0.5, true);
  dv.setFloat32(368, 0.5, true);
  dv.setInt8(372, 0 * 0x7F);
  dv.setInt8(373, 1 * 0x7F);
  dv.setInt8(374, 0 * 0x7F);
  dv.setInt8(375, 0 * 0x7F);
  dv.setUint16(376, 1 * 0xFFFF);
  dv.setUint16(378, 0 * 0xFFFF);

  //top face - right top - 19
  dv.setFloat32(380, 0.5, true);
  dv.setFloat32(384, 0.5, true);
  dv.setFloat32(388, -0.5, true);
  dv.setInt8(392, 0 * 0x7F);
  dv.setInt8(393, 1 * 0x7F);
  dv.setInt8(394, 0 * 0x7F);
  dv.setInt8(395, 0 * 0x7F);
  dv.setUint16(396, 1 * 0xFFFF);
  dv.setUint16(398, 1 * 0xFFFF);

  //bottom face - left bottom - 20
  dv.setFloat32(400, -0.5, true);
  dv.setFloat32(404, -0.5, true);
  dv.setFloat32(408, -0.5, true);
  dv.setInt8(412, 0 * 0x7F);
  dv.setInt8(413, -1 * 0x7F);
  dv.setInt8(414, 0 * 0x7F);
  dv.setInt8(415, 0 * 0x7F);
  dv.setUint16(416, 0 * 0xFFFF);
  dv.setUint16(418, 0 * 0xFFFF);

  //bottom face - left top - 21
  dv.setFloat32(420, -0.5, true);
  dv.setFloat32(424, -0.5, true);
  dv.setFloat32(428, 0.5, true);
  dv.setInt8(432, 0 * 0x7F);
  dv.setInt8(433, -1 * 0x7F);
  dv.setInt8(434, 0 * 0x7F);
  dv.setInt8(435, 0 * 0x7F);
  dv.setUint16(436, 0 * 0xFFFF);
  dv.setUint16(438, 1 * 0xFFFF);

  //bottom face - right bottom - 22
  dv.setFloat32(440, 0.5, true);
  dv.setFloat32(444, -0.5, true);
  dv.setFloat32(448, -0.5, true);
  dv.setInt8(452, 0 * 0x7F);
  dv.setInt8(453, -1 * 0x7F);
  dv.setInt8(454, 0 * 0x7F);
  dv.setInt8(455, 0 * 0x7F);
  dv.setUint16(456, 1 * 0xFFFF);
  dv.setUint16(458, 0 * 0xFFFF);

  //bottom face - right top - 23
  dv.setFloat32(460, 0.5, true);
  dv.setFloat32(464, -0.5, true);
  dv.setFloat32(468, 0.5, true);
  dv.setInt8(472, 0 * 0x7F);
  dv.setInt8(473, -1 * 0x7F);
  dv.setInt8(474, 0 * 0x7F);
  dv.setInt8(475, 0 * 0x7F);
  dv.setUint16(476, 1 * 0xFFFF);
  dv.setUint16(478, 1 * 0xFFFF);
}
const vbo = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
gl.bufferData(gl.ARRAY_BUFFER, buf, gl.STATIC_DRAW);

var loc = defaultProg.attriLoc('a_position');
gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 20, 0);
gl.enableVertexAttribArray(loc);

loc = defaultProg.attriLoc('a_normal');
gl.vertexAttribPointer(loc, 4, gl.BYTE, true, 20, 12);
gl.enableVertexAttribArray(loc);

loc = defaultProg.attriLoc('a_uv');
gl.vertexAttribPointer(loc, 2, gl.UNSIGNED_SHORT, true, 20, 16);
gl.enableVertexAttribArray(loc);

// create & bind & initialize index buffer
var ibo = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);

var indicies = [
  2, 1, 0, 1, 2, 3, // front
  6, 5, 4, 5, 6, 7, // top
  10, 9, 8, 9, 10, 11, // back
  14, 13, 12, 13, 14, 15, // bottom
  18, 17, 16, 17, 18, 19, // right
  22, 21, 20, 21, 22, 23  // left
];

gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indicies), gl.STATIC_DRAW);

// viewport
//webglUtils.resizeCanvasToDisplaySize(gl.canvas);
gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

// Clear the canvas
gl.clearColor(1, 0, 0, 1);
gl.clear(gl.COLOR_BUFFER_BIT);

gl.enable(gl.CULL_FACE);
gl.cullFace(gl.BACK);

function draw(timestamp) {
  // Clear the canvas
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  // bind ibo
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);

  tex.bind();
  // update uniform
  defaultProg.use();
  defaultProg.bindTexture2D('Sampler', 0);
  defaultProg.bindUniform3fv('LightPos', [3.0, 3.0, 3.0]);
  defaultProg.bindUniformMatrix4fv('u_matModel', mat4.fromRotation([], timestamp / 1000, [2.0, 3.0, 1.0]));
  defaultProg.bindUniformMatrix4fv('u_matView', mat4.lookAt(
    [],
    [0.0, 0.0, 2.0], // position Math.sin(timestamp/1000)
    [0.0, 0.0, 0.0], // target
    [0.0, 1.0, 0.0]  // up
  ));
  defaultProg.bindUniformMatrix4fv('u_matProj', mat4.perspective(
    [],
    1.0, //fov
    gl.canvas.width / gl.canvas.height,
    0.001, // near plane
    1000 // far plane
  ));

  // actual draw call
  var primitiveType = gl.LINE_STRIP;
  var offset = 0;
  var count = 3;
  // gl.drawArrays(primitiveType, offset, count);
  gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);

  // request next frame
  window.requestAnimationFrame(draw);
}

window.requestAnimationFrame(draw);