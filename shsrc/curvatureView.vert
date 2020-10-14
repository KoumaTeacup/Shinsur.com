#version 300 es
 
in vec3 a_position;
in vec4 a_normal;
in vec4 a_snormal;
in vec4 a_curvature1;
in vec4 a_curvature2;
in vec4 a_curvature3;
uniform mat4 MatModel;
uniform mat4 MatView;
uniform mat4 MatProj;
out vec3 Normal;
out vec3 SNormal;
out float Curvature1;
out float Curvature2;
out float Curvature3;
out vec3 PrimaryCurvatureDir1;
out vec3 PrimaryCurvatureDir2;
out vec3 PrimaryCurvatureDir3;

void main() {
  gl_Position = MatProj * MatView * MatModel * vec4(a_position, 1.0);
  Normal = (MatModel * a_normal).xyz;
  SNormal = (MatModel * a_snormal).xyz;
  Curvature1 = a_curvature1.w;
//  PrimaryCurvatureDir = (MatView * MatModel * vec4(a_curvature.xyz, 0.0)).xyz;
  PrimaryCurvatureDir1 = a_curvature1.xyz;
  PrimaryCurvatureDir2 = a_curvature2.xyz;
  PrimaryCurvatureDir3 = a_curvature3.xyz;
}