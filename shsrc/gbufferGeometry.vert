#version 300 es
 
in vec3 a_position;
in vec4 a_tanget;
in vec4 a_normal;
in vec4 a_snormal;
in vec2 a_uv;
in vec4 a_curvature1;
in vec4 a_curvature2;
in vec4 a_curvature3;
in vec3 a_curvaturePos1;
in vec3 a_curvaturePos2;
in vec3 a_curvaturePos3;
uniform mat4 MatModel;
uniform mat4 MatView;
uniform mat4 MatProj;
out vec3 WorldPos;
out vec3 Tanget;
out vec3 Normal;
out vec3 SNormal;
out vec2 UV;
out vec4 Curvature1;
out vec4 Curvature2;
out vec4 Curvature3;
 
vec3 ProjectCurvature(vec3 Curvature, vec3 VertPos, mat4 MVP) {
  vec4 EndPoint = MVP * vec4(VertPos + Curvature, 1.0);
  EndPoint = EndPoint / EndPoint.w;
  vec4 StartPoint = MVP * vec4(VertPos, 1.0);
  StartPoint = StartPoint / StartPoint.w;
  return normalize(EndPoint.xyz - StartPoint.xyz);
}

void main() {
  mat4 MVP = MatProj * MatView * MatModel;
  gl_Position = MVP * vec4(a_position, 1.0);
  WorldPos = (MatModel * vec4(a_position, 1.0)).xyz;
  Tanget = a_tanget.xyz;
  Normal = (MatModel * a_normal).xyz;
  SNormal = (MatModel * a_snormal).xyz;
  UV = a_uv;
  Curvature1 = vec4(ProjectCurvature(a_curvature1.xyz, a_curvaturePos1, MVP), a_curvature1.w);
  Curvature2 = vec4(ProjectCurvature(a_curvature2.xyz, a_curvaturePos2, MVP), a_curvature2.w);
  Curvature3 = vec4(ProjectCurvature(a_curvature3.xyz, a_curvaturePos3, MVP), a_curvature3.w);
//  CurvatureEndPoint1 = (MatProj * MatView * MatModel* vec4(a_curvature1.xyz, 0.0)).xyz;
//  CurvatureEndPoint2 = (MatProj * MatView * MatModel* vec4(a_curvature2.xyz, 0.0)).xyz;
//  CurvatureEndPoint3 = (MatProj * MatView * MatModel* vec4(a_curvature3.xyz, 0.0)).xyz;
//  CurvatureEndPoint1 = a_curvature1.xyz + a_position;
//  CurvatureEndPoint2 = a_curvature2.xyz + a_position;
//  CurvatureEndPoint3 = a_curvature3.xyz + a_position;


}