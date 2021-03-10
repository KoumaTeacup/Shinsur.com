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
flat out vec4 Curvature1;
flat out vec4 Curvature2;
flat out vec4 Curvature3;
flat out vec3 CurvaturePos1;
flat out vec3 CurvaturePos2;
flat out vec3 CurvaturePos3;
flat out vec2 RandomOffset1;
flat out vec2 RandomOffset2;
flat out vec2 RandomOffset3;
 
// Interleaved Gradient Noise
//  - Jimenez, Next Generation Post Processing in Call of Duty: Advanced Warfare
//    Advances in Real-time Rendering, SIGGRAPH 2014
// 4 flops + 1 2 frac
float ign(vec2 v) {
    vec3 magic = vec3(0.06711056f, 0.00583715f, 52.9829189f);
    return fract(magic.z * fract(dot(v, magic.xy)));
}

// UE4 PseudoRandom function
float pseudo(vec2 v) {
    v = fract(v/128.)*128.f + vec2(-64.340622f, -72.465622f);
    return fract(dot(v.xyx * v.xyy, vec3(20.390625f, 60.703125f, 2.4281209f)));
}

vec3 ProjectCurvature(vec3 Curvature, vec3 VertPos, mat4 MVP) {
  vec4 EndPoint = MVP * vec4(VertPos + Curvature, 1.0);
  EndPoint = EndPoint / EndPoint.w;
  vec4 StartPoint = MVP * vec4(VertPos, 1.0);
  StartPoint = StartPoint / StartPoint.w;
  return normalize(EndPoint.xyz - StartPoint.xyz);
}

vec3 ProjectCurvaturePos(vec3 CurvaturePos, mat4 MVP) {
  vec4 ProjectedPos = MVP * vec4(CurvaturePos, 1.0);
  ProjectedPos = ProjectedPos / ProjectedPos.w;
  return ProjectedPos.xyz;
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
  CurvaturePos1 = ProjectCurvaturePos(a_curvaturePos1.xyz, MVP);
  CurvaturePos2 = ProjectCurvaturePos(a_curvaturePos2.xyz, MVP);
  CurvaturePos3 = ProjectCurvaturePos(a_curvaturePos3.xyz, MVP);
  
  RandomOffset1 = vec2(ign(a_curvaturePos1.xy), pseudo(a_curvaturePos1.xy));
  RandomOffset2 = vec2(ign(a_curvaturePos2.xy), pseudo(a_curvaturePos2.xy));
  RandomOffset3 = vec2(ign(a_curvaturePos3.xy), pseudo(a_curvaturePos3.xy));
}