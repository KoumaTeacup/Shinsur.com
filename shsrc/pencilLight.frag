#version 300 es
 
// fragment shaders don't have a default precision so we need
// to pick one. highp is a good default. It means "high precision"
precision highp float;
precision highp sampler3D;
 
uniform sampler2D WorldPosSampler;
uniform sampler2D DiffuseSampler;
uniform sampler2D NormalSampler;
uniform sampler2D SNormalSampler;
uniform sampler2D TexCoordSampler;
uniform sampler2D CurvatureSampler1;
uniform sampler2D CurvatureSampler2;
uniform sampler2D CurvatureSampler3;
uniform sampler3D HatchingSampler;
out vec4 OutColor;

void main() {
	float PI = 3.1415926;

	ivec2 TexutreSize = textureSize(WorldPosSampler, 0);
	vec2 SampleUV = gl_FragCoord.xy / vec2(TexutreSize);
	
	vec3 CurvatureDir = texture(CurvatureSampler3, SampleUV).rgb;
	float angle = atan(CurvatureDir.y / CurvatureDir.x);

//	angle = PI / 4.0;
	mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
	SampleUV = rot * SampleUV;

	vec3 HatchingColor = texture(HatchingSampler, vec3(SampleUV * 2.0, 0.8)).rgb;
	OutColor = length(CurvatureDir) > 0.0 ? vec4(HatchingColor, 1.0) : vec4(0.0);
//	OutColor = vec4(vec3(angle), 1.0);
//	OutColor = vec4(CurvatureDir, 1.0);
}