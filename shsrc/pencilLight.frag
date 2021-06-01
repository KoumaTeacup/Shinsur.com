#version 300 es
 
// fragment shaders don't have a default precision so we need
// to pick one. highp is a good default. It means "high precision"
precision highp float;
precision highp sampler3D; 

// Maps
uniform sampler2D WorldPosSampler;
uniform sampler2D DiffuseSampler;
uniform sampler2D NormalSampler;
uniform sampler2D SNormalSampler;
uniform sampler2D TexCoordSampler;
uniform sampler2D CurvatureSampler1;
uniform sampler2D CurvatureSampler2;
uniform sampler2D CurvatureSampler3;
uniform sampler2D BackgroundDiffSampler;
uniform sampler3D HatchingSampler;

// Shadow
uniform int NPRWidth;
uniform bool ShadowEnabled;
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
uniform float HatchingSliceCoord;

// Paper Effect
uniform int UsePaperDiffuse;
uniform int UsePaperNormal;
uniform float PaperEffectWeight;

out vec4 OutColor;

vec3 SampleHatchingColor(sampler2D CurvatureSampler, vec2 ScreenSampleUV, sampler3D HatchingSampler, float HatchingSliceCoord)
{
	vec3 CurvatureSampleUV = texture(CurvatureSampler, ScreenSampleUV).xyz;
	return (1.0 - texture(HatchingSampler, vec3(CurvatureSampleUV.xy, HatchingSliceCoord)).rgb) * CurvatureSampleUV.z;
}

void main() {
	if(NPRWidth >= 0 && int(gl_FragCoord.x) < NPRWidth) discard;

	ivec2 ScreenTexutreSize = textureSize(WorldPosSampler, 0);
	vec2 ScreenSampleUV = gl_FragCoord.xy / vec2(ScreenTexutreSize);

	// shadow calculation
	vec3 WorldPos = texture(WorldPosSampler, ScreenSampleUV).rgb;
	vec3 Normal = texture(NormalSampler, ScreenSampleUV).rgb;
	vec3 DiffuseColor = texture(DiffuseSampler, ScreenSampleUV).rgb;
	float Roughness = texture(DiffuseSampler, ScreenSampleUV).a;
	
	vec4 vecShadowMV = MatShadowView * vec4(WorldPos, 1.0);
	float ShadowDepth = vecShadowMV.z;
	vec4 ShadowClip = MatShadowProj * vecShadowMV;
	vec2 ShadowUV = (ShadowClip / ShadowClip.w).xy / 2.0 + 0.5;

	// PCF sampling
	float ShadowMapDepth = texture(ShadowSampler, ShadowUV).r;
	float ShadowFactor = clamp(exp((ShadowDepth+ ShadowBias) * ShadowExpScale) * exp(-ShadowMapDepth * ShadowExpScale), 0.0, 1.0);
	ShadowFactor = ShadowEnabled ? ShadowFactor : 1.0;

	// light calculation
	vec3 L = normalize(LightPos - WorldPos);
	vec3 V = normalize(CameraPos - WorldPos);
	float NdotL = dot(Normal, L);
	vec3 R = normalize(NdotL * Normal * 2.0 -L);
	float Ambient = 0.15;
	float Diffuse = clamp(NdotL,0.0, 1.0);
	float Specular = pow(clamp(dot(R, V), 0.0, 1.0), Roughness);
	float Light = (Ambient + (Diffuse + Specular) * ShadowFactor) * LightIntensity;// * LightColor;
	float gamma = 2.25;
//	float RedFactor = max(pow(DiffuseColor.r * (2.0 - DiffuseColor.g - DiffuseColor.b), 4.0), 0.0);
	DiffuseColor = pow(DiffuseColor, vec3(gamma));
	Light *= pow(DiffuseColor.x + DiffuseColor.y + DiffuseColor.z, 1.0/gamma);

	// Hatching Calculation
	float SliceCoord = (clamp((1.0 - Light), 0.0, 1.0) * 7.0 + 1.0 - 0.5) / float(NumHatchingSlices);
	
	vec4 CurvatureSample1 = texture(CurvatureSampler1, ScreenSampleUV);
	vec4 CurvatureSample2 = texture(CurvatureSampler2, ScreenSampleUV);
	vec4 CurvatureSample3 = texture(CurvatureSampler3, ScreenSampleUV);

	vec3 HatchingIntensity1 = 1.0 - texture(HatchingSampler, vec3(CurvatureSample1.xy, SliceCoord)).rgb;
	vec3 HatchingIntensity2 = 1.0 - texture(HatchingSampler, vec3(CurvatureSample2.xy, SliceCoord)).rgb;
	vec3 HatchingIntensity3 = 1.0 - texture(HatchingSampler, vec3(CurvatureSample3.xy, SliceCoord)).rgb;

	float paperEffectPower = 0.2;

	HatchingIntensity1 -= pow(HatchingIntensity1.x, paperEffectPower) * (UsePaperNormal == 0 ? 0.0 : CurvatureSample1.w);
	HatchingIntensity2 -= pow(HatchingIntensity2.x, paperEffectPower) * (UsePaperNormal == 0 ? 0.0 : CurvatureSample2.w);
	HatchingIntensity3 -= pow(HatchingIntensity3.x, paperEffectPower) * (UsePaperNormal == 0 ? 0.0 : CurvatureSample3.w);

	float WeightSum = CurvatureSample1.z + CurvatureSample2.z + CurvatureSample3.z;
	float BlendWeight1 = CurvatureSample1.z / WeightSum;
	float BlendWeight2 = CurvatureSample2.z / WeightSum;
	float BlendWeight3 = CurvatureSample3.z / WeightSum;

	vec3 WeightedIntensity = HatchingIntensity1 * BlendWeight1 + HatchingIntensity2 * BlendWeight2 + HatchingIntensity3 * BlendWeight3;

	// Don't draw if no mesh
	WeightedIntensity = WeightSum > 0.0 ? WeightedIntensity : vec3(0.0);

	// final output
	OutColor = vec4(1.0 - WeightedIntensity, 1.0);

	// Red Factor
//	OutColor.rgb = OutColor.rgb * pow(1.0 - RedFactor) + vec3(1.0, 0.0, 0.0) * clamp(Light, 0.0, 1.0) * RedFactor;

	// Background blend
	vec4 BackgroundColor = UsePaperDiffuse == 0 ? vec4(1.0) : 1.0 - (1.0 - texture(BackgroundDiffSampler, ScreenSampleUV)) * PaperEffectWeight;
	OutColor = min(BackgroundColor, OutColor);
	OutColor = ShadowView == 0 ? OutColor : vec4(vec3(ShadowFactor), 1.0);

//	OutColor = vec4(vec3(RedFactor), 1.0);
//	OutColor = vec4(HatchingIntensity1, 1.0);
}