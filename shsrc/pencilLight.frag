#version 300 es
 
// fragment shaders don't have a default precision so we need
// to pick one. highp is a good default. It means "high precision"
precision highp float;

uniform int ShadowView;
uniform float LightIntensity;
uniform float ShadowBias;
uniform float ShadowExpScale;
uniform vec3 LightPos;
uniform vec3 CameraPos;
uniform vec3 LightColor;
uniform mat4 MatShadowView;
uniform mat4 MatShadowProj;
uniform sampler2D WorldPosSampler;
uniform sampler2D DiffuseSampler;
uniform sampler2D NormalSampler;
uniform sampler2D SNormalSampler;
uniform sampler2D TexCoordSampler;
uniform sampler2D ShadowSampler;
out vec4 OutColor;
 
void main() {
	// load gbuffer textures
	ivec2 GBufferSize = textureSize(WorldPosSampler, 0);
	vec2 GBufferUV = gl_FragCoord.xy / vec2(GBufferSize);
	vec3 WorldPos = texture(WorldPosSampler, GBufferUV.st).rgb;
	vec3 DiffuseColor = texture(DiffuseSampler, GBufferUV.st).rgb;
	float Roughness = texture(DiffuseSampler, GBufferUV.st).a;
	vec3 Normal = texture(NormalSampler, GBufferUV.st).rgb;
	vec3 SNormal = texture(SNormalSampler, GBufferUV.st).rgb;
	vec2 TexCoord = texture(TexCoordSampler, GBufferUV.st).rg;
	
	// light calculation
	vec3 V = normalize(CameraPos - WorldPos);
	float NdotV = dot(Normal, V);

//	int NumSamples = 20;
//	float SampleRadius = 2.0;
//	float Tolerance = 0.2;
//	float Threshold = 0.2;
//	// Sampling surrounding pixels
//	float PI = 3.1415926528;
//	float UnitAngle = 2.0 * PI / float(NumSamples);
//	float Max = NdotV;
//	int NumDarker = 0;
//	for (int i = 0; i < NumSamples; i++){
//		vec2 SampleUV = GBufferUV;
//		SampleUV.s += cos(UnitAngle * float(i)) * SampleRadius / float(GBufferSize.x);
//		SampleUV.t += sin(UnitAngle * float(i)) * SampleRadius / float(GBufferSize.y);
//		vec3 SampleNormal = texture(NormalSampler, SampleUV.st).rgb;
//		float SampleNdotV = dot(SampleNormal, V);
//		Max = Max < SampleNdotV ? SampleNdotV : Max;
//		NumDarker = NdotV > SampleNdotV ? NumDarker + 1: NumDarker;
//	}
//
//	float ContourFactor = (float(NumDarker) / float(NumSamples) < Tolerance && Max - NdotV > Threshold) ? 0.0 : 1.0;
//	float ContourFactor = Max - NdotV > Threshold ? 0.0 : 1.0;

	// final output
	OutColor = (Normal == vec3(0.0, 0.0, 0.0)) ? vec4(1.0, 1.0, 1.0, 0.0) : vec4(vec3(SNormal), 1.0);
}