#version 300 es
 
in vec3 a_position;
in vec4 a_tanget;
in vec4 a_normal;
in vec2 a_uv;
uniform mat4 MatModel;
uniform mat4 MatView;
uniform mat4 MatProj;
uniform mat4 MatShadowView;
uniform mat4 MatShadowProj;
out vec3 WorldPos;
out vec3 Tanget;
out vec3 Normal;
out vec2 UV;
out float ShadowDepth;
out vec4 ShadowClip;

void main() {
  vec4 vecM = MatModel * vec4(a_position, 1.0);
  WorldPos = vecM.xyz;
  gl_Position = MatProj * MatView * vecM;
  Tanget = a_tanget.xyz;
  Normal = (MatModel * a_normal).xyz;
  UV = a_uv;
  vec4 vecShadowMV = MatShadowView * MatModel * vec4(a_position, 1.0);
  ShadowDepth = vecShadowMV.z;
  ShadowClip = MatShadowProj * vecShadowMV;
}