#version 300 es
 
// an attribute is an input (in) to a vertex shader.
// It will receive data from a buffer
in vec4 a_position;
uniform mat4 u_matModel;
uniform mat4 u_matView;
uniform mat4 u_matProj;
uniform vec2 u_offset;
out vec4 Pos;
 
// all shaders have a main function
void main() {
 
  // gl_Position is a special variable a vertex shader
  // is responsible for setting
  gl_Position = u_matProj * u_matView * u_matModel*  a_position;//  * u_matModel * u_matView;// * u_matProj; //vec4(a_position.xy + u_offset.xy, 0.0f, 1.0f);
  Pos = gl_Position;
}