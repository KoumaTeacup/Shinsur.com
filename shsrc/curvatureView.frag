#version 300 es
 
// fragment shaders don't have a default precision so we need
// to pick one. highp is a good default. It means "high precision"
precision highp float;

in vec3 Normal;
in vec3 SNormal;
in float Curvature;
in vec3 PrimaryCurvatureDir;
uniform bool ShowSmoothed;
out vec4 OutColor;
 
void main() {
	OutColor = vec4(PrimaryCurvatureDir * 0.5 + 0.5, 1.0);
//	OutColor = vec4(vec3(Curvature), 1.0);
}