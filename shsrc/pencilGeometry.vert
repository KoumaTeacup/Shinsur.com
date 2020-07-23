#version 300 es
 
in vec3 a_position;
in vec4 a_tanget;
in vec4 a_normal;
in vec4 a_snormal;
in vec2 a_uv;
uniform mat4 MatModel;
uniform mat4 MatView;
uniform mat4 MatProj;
out vec3 WorldPos;
out vec3 Tanget;
out vec3 Normal;
out vec3 SNormal;
out vec2 UV;
 
void main() {
  gl_Position = MatProj * MatView * MatModel* vec4(a_position, 1.0);
  WorldPos = (MatModel * vec4(a_position, 1.0)).xyz;
  Tanget = a_tanget.xyz;
  Normal = (MatModel * a_normal).xyz;
  SNormal = (MatModel * a_snormal).xyz;
  UV = a_uv;
}