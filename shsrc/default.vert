#version 300 es
 
// an attribute is an input (in) to a vertex shader.
// It will receive data from a buffer
in vec4 a_position;
in vec4 a_normal;
in vec2 a_uv;
uniform mat4 u_matModel;
uniform mat4 u_matView;
uniform mat4 u_matProj;
uniform vec2 u_offset;
out vec4 WorldPos;
out vec3 Normal;
 
// all shaders have a main function
void main() {
 
  // gl_Position is a special variable a vertex shader
  // is responsible for setting
  WorldPos = u_matModel * a_position;
  gl_Position = u_matProj * u_matView * WorldPos;//  * u_matModel * u_matView;// * u_matProj; //vec4(a_position.xy + u_offset.xy, 0.0f, 1.0f);
  Normal = (u_matModel * a_normal).xyz;
}