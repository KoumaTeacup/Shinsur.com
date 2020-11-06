#version 300 es
 
// fragment shaders don't have a default precision so we need
// to pick one. highp is a good default. It means "high precision"
precision highp float;
precision highp sampler3D;

in vec3 Normal;
in vec3 SNormal;
in float Curvature1;
in float Curvature2;
in float Curvature3;
in vec3 PrimaryCurvatureDir1;
in vec3 PrimaryCurvatureDir2;
in vec3 PrimaryCurvatureDir3;
in vec3 PrimaryCurvatureProj1;
in vec3 PrimaryCurvatureProj2;
in vec3 PrimaryCurvatureProj3;
uniform bool ShowSmoothed;
uniform int CurvatureDebugOption;
out vec4 OutColor;
 
void main() {
	float PI = 3.1415926;
//	vec2 SampleUV = gl_FragCoord.xy / vec2(1280.0, 720.0);

	vec3 Color = vec3(0.0);
	Color += CurvatureDebugOption == 0 ? vec3(Curvature1) : vec3(0.0);
	Color += CurvatureDebugOption == 1 ? (PrimaryCurvatureDir1 + vec3(1.0)) / 2.0 : vec3(0.0);
	Color += CurvatureDebugOption == 2 ? (PrimaryCurvatureProj1 + vec3(1.0)) / 2.0 : vec3(0.0);

	OutColor = vec4(Color, 1.0);
}