#version 300 es
 
// fragment shaders don't have a default precision so we need
// to pick one. highp is a good default. It means "high precision"
precision highp float;
 
uniform float LightIntensity;
uniform vec3 LightPos;
uniform vec3 CameraPos;
uniform vec3 LightColor;
uniform ivec2 DrawSize;
uniform sampler2D WorldPosSampler;
uniform sampler2D DiffuseSampler;
uniform sampler2D NormalSampler;
uniform sampler2D TexCoordSampler;
out vec4 OutColor;
 
void main() {
	vec2 GBufferUV = gl_FragCoord.xy / vec2(DrawSize);
	vec3 WorldPos = texture(WorldPosSampler, GBufferUV.st).rgb;
	vec3 DiffuseColor = texture(DiffuseSampler, GBufferUV.st).rgb;
	float Roughness = texture(DiffuseSampler, GBufferUV.st).a;
	vec3 Normal = texture(NormalSampler, GBufferUV.st).rgb;
	vec2 TexCoord = texture(TexCoordSampler, GBufferUV.st).rg;

	vec3 L = normalize(vec3(LightPos - WorldPos));
	vec3 V = normalize(CameraPos - WorldPos);
	float NdotL = dot(Normal, L);
	vec3 R = normalize(NdotL * Normal * 2.0 -L);
	float Ambient = 0.15;
	float Diffuse = max(NdotL,0.0f);
	float Specular = max(pow(dot(R, V), 1.0),0.0);
	vec3 Light = (Ambient + Diffuse + Specular) * LightIntensity * LightColor;
	OutColor = vec4(DiffuseColor * Light, 1.0);
}