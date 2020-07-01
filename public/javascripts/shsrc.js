export let default_fs = `#version 300 es
precision highp float;
out vec4 outColor;in vec4 Pos;
void main() {outColor = Pos;}`, default_vs = `#version 300 es
in vec4 a_position;uniform mat4 u_matModel;uniform mat4 u_matView;uniform mat4 u_matProj;uniform vec2 u_offset;out vec4 Pos;
void main() { gl_Position = u_matProj * u_matView * u_matModel*a_position;Pos = gl_Position;}`;