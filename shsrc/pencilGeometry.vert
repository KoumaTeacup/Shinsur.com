#version 300 es
 
in vec3 a_position;
in vec4 a_tanget;
in vec4 a_normal;
in vec4 a_snormal;
in vec2 a_uv;
in vec4 a_curvature;
uniform mat4 MatModel;
uniform mat4 MatView;
uniform mat4 MatProj;
out vec3 WorldPos;
out vec3 Tanget;
out vec3 Normal;
out vec3 SNormal;
out vec2 UV;
out float Curvature;
out vec3 MaxCurvatureDir;
 
void main() {
  gl_Position = MatProj * MatView * MatModel* vec4(a_position, 1.0);
  WorldPos = (MatModel * vec4(a_position, 1.0)).xyz;
  Tanget = a_tanget.xyz;
  Normal = (MatModel * a_normal).xyz;
  SNormal = (MatModel * a_snormal).xyz;
  Curvature = a_curvature.w;
  MaxCurvatureDir = (MatModel * vec4(a_curvature.xyz, 0.0)).xyz;
  UV = a_uv;
}