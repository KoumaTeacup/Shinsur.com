#version 300 es
 
// fragment shaders don't have a default precision so we need
// to pick one. highp is a good default. It means "high precision"
precision highp float;
 
uniform int ShadowView;
uniform float LightIntensity;
uniform float ShadowBias;
uniform vec3 LightPos;
uniform vec3 CameraPos;
uniform vec3 LightColor;
uniform mat4 MatShadowView;
uniform mat4 MatShadowProj;
uniform sampler2D WorldPosSampler;
uniform sampler2D DiffuseSampler;
uniform sampler2D NormalSampler;
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
	vec2 TexCoord = texture(TexCoordSampler, GBufferUV.st).rg;
	
	// shadow calculation
	vec4 vecShadowMV = MatShadowView * vec4(WorldPos, 1.0);
	float ShadowDepth = vecShadowMV.z;
	vec4 ShadowClip = MatShadowProj * vecShadowMV;
	vec2 ShadowUV = (ShadowClip / ShadowClip.w).xy / 2.0 + 0.5;

	// PCF sampling
	float ShadowMapDepth = texture(ShadowSampler, ShadowUV).r;
	float ShadowFactor = ShadowDepth + ShadowBias > ShadowMapDepth ? 1.0 : 0.0;

	// light calculation
	vec3 L = normalize(LightPos - WorldPos);
	vec3 V = normalize(CameraPos - WorldPos);
	float NdotL = dot(Normal, L);
	vec3 R = normalize(NdotL * Normal * 2.0 -L);
	float Ambient = 0.15;
	float Diffuse = clamp(NdotL,0.0, 1.0);
	float Specular = pow(clamp(dot(R, V), 0.0, 1.0), Roughness);
	vec3 Light = (Ambient + (Diffuse + Specular) * ShadowFactor) * LightIntensity * LightColor;

	// final output
	OutColor = vec4(DiffuseColor * Light, 1.0);
	OutColor = ShadowView == 0 ? OutColor : vec4(vec3(ShadowFactor), 1.0);
}