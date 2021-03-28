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

// Shadow
uniform bool ShadowDisabled;
uniform int ShadowView;
uniform float LightIntensity;
uniform float ShadowBias;
uniform float ShadowExpScale;
uniform vec3 LightPos;
uniform vec3 CameraPos;
uniform vec3 LightColor;
uniform mat4 MatShadowView;
uniform mat4 MatShadowProj;
uniform sampler2D ShadowSampler;

// Hatching
uniform int NumHatchingSlices;
uniform float HatchingSampleScale;
uniform float HatchingSliceCoord;

out vec4 OutColor;

vec3 SampleHatchingColor(sampler2D CurvatureSampler, vec2 ScreenSampleUV, sampler3D HatchingSampler, float HatchingSliceCoord)
{
	vec3 CurvatureSampleUV = texture(CurvatureSampler, ScreenSampleUV).xyz;
	return (1.0 - texture(HatchingSampler, vec3(CurvatureSampleUV.xy, HatchingSliceCoord)).rgb) * CurvatureSampleUV.z;
}

void main() {
	ivec2 ScreenTexutreSize = textureSize(WorldPosSampler, 0);
	vec2 ScreenSampleUV = gl_FragCoord.xy / vec2(ScreenTexutreSize);

	// shadow calculation
	vec3 WorldPos = texture(WorldPosSampler, ScreenSampleUV).rgb;
	vec3 Normal = texture(NormalSampler, ScreenSampleUV).rgb;
	float Roughness = texture(DiffuseSampler, ScreenSampleUV).a;
	
	vec4 vecShadowMV = MatShadowView * vec4(WorldPos, 1.0);
	float ShadowDepth = vecShadowMV.z;
	vec4 ShadowClip = MatShadowProj * vecShadowMV;
	vec2 ShadowUV = (ShadowClip / ShadowClip.w).xy / 2.0 + 0.5;

	// PCF sampling
	float ShadowMapDepth = texture(ShadowSampler, ShadowUV).r;
	float ShadowFactor = clamp(exp((ShadowDepth+ ShadowBias) * ShadowExpScale) * exp(-ShadowMapDepth * ShadowExpScale), 0.0, 1.0);
	ShadowFactor = ShadowDisabled ? 1.0 : ShadowFactor;

	// light calculation
	vec3 L = normalize(LightPos - WorldPos);
	vec3 V = normalize(CameraPos - WorldPos);
	float NdotL = dot(Normal, L);
	vec3 R = normalize(NdotL * Normal * 2.0 -L);
	float Ambient = 0.15;
	float Diffuse = clamp(NdotL,0.0, 1.0);
	float Specular = pow(clamp(dot(R, V), 0.0, 1.0), Roughness);
	float Light = (Ambient + (Diffuse + Specular) * ShadowFactor) * LightIntensity;// * LightColor;

//	Light = pow(Light, 0.4);

	// Hatching Calculation
//	float SliceCoord = ((1.0 - Light * 7.0 + 1.0 - 0.5) / float(NumHatchingSlices);
	float SliceCoord = (clamp((1.0 - Light), 0.0, 1.0) * 7.0 + 1.0 - 0.5) / float(NumHatchingSlices);
//	SliceCoord = (HatchingSliceCoord - 0.5) / float(NumHatchingSlices);
	
	vec3 CurvatureSampleUV1 = texture(CurvatureSampler1, ScreenSampleUV).xyz;
	vec3 CurvatureSampleUV2 = texture(CurvatureSampler2, ScreenSampleUV).xyz;
	vec3 CurvatureSampleUV3 = texture(CurvatureSampler3, ScreenSampleUV).xyz;

	vec3 HatchingIntensity1 = 1.0 - texture(HatchingSampler, vec3(CurvatureSampleUV1.xy, SliceCoord)).rgb;
	vec3 HatchingIntensity2 = 1.0 - texture(HatchingSampler, vec3(CurvatureSampleUV2.xy, SliceCoord)).rgb;
	vec3 HatchingIntensity3 = 1.0 - texture(HatchingSampler, vec3(CurvatureSampleUV3.xy, SliceCoord)).rgb;

	float WeightSum = CurvatureSampleUV1.z + CurvatureSampleUV2.z + CurvatureSampleUV3.z;
	float BlendWeight1 = CurvatureSampleUV1.z / WeightSum;
	float BlendWeight2 = CurvatureSampleUV2.z / WeightSum;
	float BlendWeight3 = CurvatureSampleUV3.z / WeightSum;

	vec3 WeightedIntensity = HatchingIntensity1 * BlendWeight1 + HatchingIntensity2 * BlendWeight2 + HatchingIntensity3 * BlendWeight3;
//	vec3 WeightedIntensity = HatchingIntensity1 + HatchingIntensity2 + HatchingIntensity3;

	// Don't draw if no mesh
	WeightedIntensity = WeightSum > 0.0 ? WeightedIntensity : vec3(0.0);

	// final output
	OutColor = vec4(1.0 - WeightedIntensity, 1.0);
//	OutColor = vec4(vec3(ShadowFactor), 1.0);
//	OutColor = ShadowView == 0 ? OutColor : vec4(vec3(ShadowFactor), 1.0);

//	OutColor = vec4(1.0 - WeightedIntensity, 1.0);

//	vec3 HatchingColor1 = SampleHatchingColor(CurvatureSampler1, ScreenSampleUV, HatchingSampler, SliceCoord);
//	vec3 HatchingColor2 = SampleHatchingColor(CurvatureSampler2, ScreenSampleUV, HatchingSampler, SliceCoord);
//	vec3 HatchingColor3 = SampleHatchingColor(CurvatureSampler3, ScreenSampleUV, HatchingSampler, SliceCoord);
//	vec3 HatchingIntensity = HatchingColor1;
//	HatchingIntensity = max(HatchingIntensity, HatchingColor2);
//	HatchingIntensity = max(HatchingIntensity, HatchingColor3);
//	OutColor = vec4(1.0 - HatchingIntensity, 1.0);

//	vec3 CurvatureSampleUV1 = texture(CurvatureSampler1, ScreenSampleUV).xyz;
//
//	OutColor = vec4(CurvatureSampleUV1.xy, 0.0, 1.0);
}