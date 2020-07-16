#version 300 es
 
in vec3 a_position;
in vec4 a_tanget;
in vec4 a_normal;
in vec2 a_uv;
uniform mat4 u_matModel;
uniform mat4 u_matView;
uniform mat4 u_matProj;
out vec3 WorldPos;
out vec3 Tanget;
out vec3 Normal;
out vec2 UV;
 
void main() {
  gl_Position = u_matProj * u_matView * vec4(a_position, 1.0);
  WorldPos = (u_matModel * vec4(a_position, 1.0)).xyz;
  Tanget = a_tanget.xyz;
  Normal = (u_matModel * a_normal).xyz;
  UV = a_uv;
}