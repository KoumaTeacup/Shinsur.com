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
uniform mat4 MatModel;
uniform mat4 MatView;
uniform mat4 MatProj;
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
	vec3 SNormal = normalize(texture(SNormalSampler, GBufferUV.st).rgb);
	vec2 TexCoord = texture(TexCoordSampler, GBufferUV.st).rg;
	
	vec3 V = normalize(CameraPos - WorldPos);
	float NdotV = dot(SNormal, V);

	int NumSamples = 10;
	float SampleRadius = 0.9;
	float Tolerance = 0.8;
	float Threshold = 0.5;
	// Sampling surrounding pixels
	float PI = 3.1415926528;
	float UnitAngle = 2.0 * PI / float(NumSamples);
	float Max = NdotV;
	int NumDarker = 0;

	float DepthThreshold = 0.01;
	float Depth = (MatProj * MatView * vec4(WorldPos, 1.0)).z;
	float SampleDepthSum = 0.0;
	
	float NormalFactor = 1.0;

	for (int i = 0; i < NumSamples; i++){
		vec2 SampleUV = GBufferUV;
		SampleUV.s += cos(UnitAngle * float(i)) * SampleRadius / float(GBufferSize.x);
		SampleUV.t += sin(UnitAngle * float(i)) * SampleRadius / float(GBufferSize.y);

		// Normal Sample
		vec3 SampleNormal = normalize(texture(SNormalSampler, SampleUV.st).rgb);
		NormalFactor *= max(dot(SampleNormal, SNormal), 0.0) < 0.5 ? 0.0 : 1.0;
		float SampleNdotV = dot(SampleNormal, V);
		Max = Max < SampleNdotV ? SampleNdotV : Max;
		NumDarker = NdotV > SampleNdotV ? NumDarker + 1: NumDarker;

		vec3 SamplePos = texture(WorldPosSampler, SampleUV.st).rgb;
		SampleDepthSum += (MatProj * MatView * vec4(SamplePos, 1.0)).z;
	}

	float DepthFactor = abs((Depth * float(NumSamples) - SampleDepthSum)/Depth) > DepthThreshold ? 0.0 : 1.0;
	float NdotVFactor = float(NumDarker) / float(NumSamples) > Tolerance ? 0.0 : 1.0;
	float ContourFactor = DepthFactor * NormalFactor;

	OutColor = (Normal == vec3(0.0, 0.0, 0.0)) ? vec4(1.0, 1.0, 1.0, 0.0) : vec4(vec3(ContourFactor), 1.0);
//	OutColor = vec4(1.0, 0.0, 0.0, 1.0);
}