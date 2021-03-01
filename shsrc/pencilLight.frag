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

uniform int NumHatchingSlices;
uniform float HatchingSampleScale;
uniform float HatchingSliceCoord;

out vec4 OutColor;

vec3 CalculateHatchingColor(vec2 HatchingSampleUV, vec2 ScreenSampleUV, sampler2D CurvatureSampler, float SliceCoord)
{
	float PI = 3.1415926;

	vec3 CurvatureDir = texture(CurvatureSampler, ScreenSampleUV).rgb;
	float angle = atan(CurvatureDir.y, CurvatureDir.x);
	mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
	HatchingSampleUV = rot * (HatchingSampleUV - vec2(0.5)) + vec2(0.5);

	vec3 HatchingColor = texture(HatchingSampler, vec3(HatchingSampleUV, SliceCoord)).rgb;
	return length(CurvatureDir) > 0.0 ? HatchingColor : vec3(1.0);
}

void main() {
	// Calculate coordinate of the curvature sample
	ivec2 ScreenTexutreSize = textureSize(WorldPosSampler, 0);
	vec2 ScreenSampleUV = gl_FragCoord.xy / vec2(ScreenTexutreSize);
	
	// Calculate coordinate of the hatching texture sample
	ivec2 HatchingTexutreSize = textureSize(HatchingSampler, 0).xy;
	vec2 HatchingSampleUV = mod(gl_FragCoord.xy / vec2(HatchingTexutreSize) * HatchingSampleScale, 1.0);

	vec3 Color = vec3(1.0, 1.0, 1.0);
	vec3 HatchingColor, HatchingColor1, HatchingColor2;
	float SliceCoord = (HatchingSliceCoord - 0.5) / float(NumHatchingSlices);

	vec2 v1 = HatchingSampleUV - vec2(0.5);
	vec2 v2 = vec2(0.5) - abs(HatchingSampleUV - vec2(0.5));
	float len1 = length(v1) * 2.0;
	len1 = max(1.0 - len1, 0.0);
	float len2 = length(v2) * 2.0;
	len2 = max(1.0 - len2, 0.0);
	float weight1 = len1 / (len1 + len2);
	float weight2 = 1.0 - weight1;

	vec2 AltHatchingUV = mod(abs(HatchingSampleUV + vec2(0.5)), 1.0);
	
	HatchingColor1 = CalculateHatchingColor(HatchingSampleUV, ScreenSampleUV, CurvatureSampler1, SliceCoord);
	HatchingColor2 = CalculateHatchingColor(AltHatchingUV, ScreenSampleUV, CurvatureSampler1, SliceCoord);

	HatchingColor = vec3(1.0) - (vec3(1.0) - HatchingColor1) * weight1 - (vec3(1.0) - HatchingColor2) * weight2;
	Color = min(Color, HatchingColor);

	HatchingColor1 = CalculateHatchingColor(HatchingSampleUV, ScreenSampleUV, CurvatureSampler2, SliceCoord);
	HatchingColor2 = CalculateHatchingColor(AltHatchingUV, ScreenSampleUV, CurvatureSampler2, SliceCoord);

	HatchingColor = vec3(1.0) - (vec3(1.0) - HatchingColor1) * weight1 - (vec3(1.0) - HatchingColor2) * weight2;
	Color = min(Color, HatchingColor);

	HatchingColor1 = CalculateHatchingColor(HatchingSampleUV, ScreenSampleUV, CurvatureSampler3, SliceCoord);
	HatchingColor2 = CalculateHatchingColor(AltHatchingUV, ScreenSampleUV, CurvatureSampler3, SliceCoord);

	HatchingColor = vec3(1.0) - (vec3(1.0) - HatchingColor1) * weight1 - (vec3(1.0) - HatchingColor2) * weight2;
	Color = min(Color, HatchingColor);

	OutColor = vec4(Color, 1.0);
}