#version 300 es
 
in vec3 a_position;
in vec4 a_tanget;
in vec4 a_normal;
in vec4 a_snormal;
in vec4 a_curvature1;
in vec4 a_curvature2;
in vec4 a_curvature3;
in vec3 a_curvaturePos1;
in vec3 a_curvaturePos2;
in vec3 a_curvaturePos3;
uniform mat4 MatModel;
uniform mat4 MatView;
uniform mat4 MatProj;
out vec3 Normal;
out vec3 SNormal;
out float CurvatureSelf;
out float Curvature1;
out float Curvature2;
out float Curvature3;
out vec3 PrimaryCurvatureDirSelf;
out vec3 PrimaryCurvatureDir1;
out vec3 PrimaryCurvatureDir2;
out vec3 PrimaryCurvatureDir3;
out vec3 PrimaryCurvatureProjSelf;
out vec3 PrimaryCurvatureProj1;
out vec3 PrimaryCurvatureProj2;
out vec3 PrimaryCurvatureProj3;

void main() {
  mat4 MVP = MatProj * MatView * MatModel;

  gl_Position = MVP * vec4(a_position, 1.0);
  Normal = (MatModel * a_normal).xyz;
  SNormal = (MatModel * a_snormal).xyz;
  
  Curvature1 = a_curvature1.w;
  Curvature2 = a_curvature1.w;
  Curvature3 = a_curvature1.w;

  PrimaryCurvatureDir1 = normalize(a_curvature1.xyz);
  PrimaryCurvatureDir2 = normalize(a_curvature2.xyz);
  PrimaryCurvatureDir3 = normalize(a_curvature3.xyz);

  vec4 MVPC, MVPP;
  MVPC = MVP * vec4(a_curvaturePos1 + a_curvature1.xyz, 1.0);
  MVPC /= MVPC.w;
  MVPP = MVP * vec4(a_curvaturePos1, 1.0);
  MVPP /= MVPP.w;
  PrimaryCurvatureProj1 = vec3(MVPC.xy - MVPP.xy, 0);

  MVPC = MVP * vec4(a_curvaturePos2 + a_curvature2.xyz, 1.0);
  MVPC /= MVPC.w;
  MVPP = MVP * vec4(a_curvaturePos2, 1.0);
  MVPP /= MVPP.w;
  PrimaryCurvatureProj2 = vec3(MVPC.xy - MVPP.xy, 0);

  MVPC = MVP * vec4(a_curvaturePos3 + a_curvature3.xyz, 1.0);
  MVPC /= MVPC.w;
  MVPP = MVP * vec4(a_curvaturePos3, 1.0);
  MVPP /= MVPP.w;
  PrimaryCurvatureProj3 = vec3(MVPC.xy - MVPP.xy, 0);

  PrimaryCurvatureProj1 = normalize(PrimaryCurvatureProj1);
  PrimaryCurvatureProj2 = normalize(PrimaryCurvatureProj2);
  PrimaryCurvatureProj3 = normalize(PrimaryCurvatureProj3);

  int VertexIndex = a_tanget.w < 0.0 ? 1 : 0;
  VertexIndex = a_tanget.w > 0.0 ? 3 : VertexIndex;
  VertexIndex = VertexIndex == 0 ? 2 : VertexIndex;

  CurvatureSelf = VertexIndex == 1 ? Curvature1 : 0.0;
  CurvatureSelf = VertexIndex == 2 ? Curvature2 : CurvatureSelf;
  CurvatureSelf = VertexIndex == 3 ? Curvature3 : CurvatureSelf;
  
  PrimaryCurvatureDirSelf = VertexIndex == 1 ? PrimaryCurvatureDir1 : vec3(0.0, 0.0, 0.0);
  PrimaryCurvatureDirSelf = VertexIndex == 2 ? PrimaryCurvatureDir2 : PrimaryCurvatureDirSelf;
  PrimaryCurvatureDirSelf = VertexIndex == 3 ? PrimaryCurvatureDir3 : PrimaryCurvatureDirSelf;
  
  PrimaryCurvatureProjSelf = VertexIndex == 1 ? PrimaryCurvatureProj1 : vec3(0.0, 0.0, 0.0);
  PrimaryCurvatureProjSelf = VertexIndex == 2 ? PrimaryCurvatureProj2 : PrimaryCurvatureProjSelf;
  PrimaryCurvatureProjSelf = VertexIndex == 3 ? PrimaryCurvatureProj3 : PrimaryCurvatureProjSelf;
}