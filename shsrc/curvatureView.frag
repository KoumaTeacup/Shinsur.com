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
uniform bool ShowSmoothed;
uniform sampler3D HatchingSampler;
out vec4 OutColor;
 
void main() {
	float PI = 3.1415926;
//	vec2 SampleUV = gl_FragCoord.xy / vec2(1280.0, 720.0);

	OutColor = vec4(PrimaryCurvatureDir3 * 0.5 + 0.5, 1.0);
//	float angle = atan(PrimaryCurvatureDir1.y / PrimaryCurvatureDir1.x);

//	angle = PI / 4.0;
//	mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
//	SampleUV = rot * SampleUV;

//	float val = mod(SampleUV.y, 0.05) * 20.0;
//	OutColor = vec4(vec3(angle), 1.0);
//	OutColor = vec4(SampleUV, 0.0, 1.0);
//	OutColor = vec4(vec3(Curvature), 1.0);

	vec3 SampleUV = vec3(gl_FragCoord.xy / vec2(1280.0, 720.0), 3.0);
	OutColor = texture(HatchingSampler, SampleUV);
}