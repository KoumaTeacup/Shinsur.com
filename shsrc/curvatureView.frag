#version 300 es
 
// fragment shaders don't have a default precision so we need
// to pick one. highp is a good default. It means "high precision"
precision highp float;
precision highp sampler3D;

in vec3 Normal;
in vec3 SNormal;
in float CurvatureSelf;
in float Curvature1;
in float Curvature2;
in float Curvature3;
in vec3 PrimaryCurvatureDirSelf;
in vec3 PrimaryCurvatureDir1;
in vec3 PrimaryCurvatureDir2;
in vec3 PrimaryCurvatureDir3;
in vec3 PrimaryCurvatureProjSelf;
in vec3 PrimaryCurvatureProj1;
in vec3 PrimaryCurvatureProj2;
in vec3 PrimaryCurvatureProj3;
uniform bool ShowSmoothed;
uniform int CurvatureDebugOption;
uniform int CurvatureDebugVertexId;
out vec4 OutColor;
 
void main() {
	float PI = 3.1415926;
//	vec2 SampleUV = gl_FragCoord.xy / vec2(1280.0, 720.0);

	vec3 Curvature, PrimaryCurvatureDir, PrimaryCurvatureProj;

	Curvature = CurvatureDebugVertexId == 0 ? vec3(CurvatureSelf) : vec3(0.0, 0.0, 0.0);
	Curvature = CurvatureDebugVertexId == 1 ? vec3(Curvature1) : Curvature;
	Curvature = CurvatureDebugVertexId == 2 ? vec3(Curvature2) : Curvature;
	Curvature = CurvatureDebugVertexId == 3 ? vec3(Curvature3) : Curvature;

	PrimaryCurvatureDir = CurvatureDebugVertexId == 0 ? PrimaryCurvatureDirSelf : vec3(0.0, 0.0, 0.0);
	PrimaryCurvatureDir = CurvatureDebugVertexId == 1 ? PrimaryCurvatureDir1 : PrimaryCurvatureDir;
	PrimaryCurvatureDir = CurvatureDebugVertexId == 2 ? PrimaryCurvatureDir2 : PrimaryCurvatureDir;
	PrimaryCurvatureDir = CurvatureDebugVertexId == 3 ? PrimaryCurvatureDir3 : PrimaryCurvatureDir;
	
	PrimaryCurvatureProj = CurvatureDebugVertexId == 0 ? PrimaryCurvatureProjSelf : vec3(0.0, 0.0, 0.0);
	PrimaryCurvatureProj = CurvatureDebugVertexId == 1 ? PrimaryCurvatureProj1 : PrimaryCurvatureProj;
	PrimaryCurvatureProj = CurvatureDebugVertexId == 2 ? PrimaryCurvatureProj2 : PrimaryCurvatureProj;
	PrimaryCurvatureProj = CurvatureDebugVertexId == 3 ? PrimaryCurvatureProj3 : PrimaryCurvatureProj;

	vec3 Color = vec3(0.0);
	Color += CurvatureDebugOption == 0 ? vec3(Curvature) : vec3(0.0);
	Color += CurvatureDebugOption == 1 ? (PrimaryCurvatureDir + vec3(1.0)) / 2.0 : vec3(0.0);
	Color += CurvatureDebugOption == 2 ? (PrimaryCurvatureProj + vec3(1.0)) / 2.0 : vec3(0.0);

	OutColor = vec4(Color, 1.0);
}