#version 300 es
 
// fragment shaders don't have a default precision so we need
// to pick one. highp is a good default. It means "high precision"
precision highp float;
 
in vec3 WorldPos;
in vec3 Tanget;
in vec3 Normal;
in vec2 UV;
uniform float LightIntensity;
uniform float Roughness;
uniform vec3 LightColor;
uniform vec3 LightPos;
uniform vec3 CameraPos;
uniform sampler2D DiffuseSampler;
uniform sampler2D SpecularSampler;
uniform sampler2D NormalSampler;
uniform bool UseRawColor;
uniform vec4 RawColor;
out vec4 OutColor;
 
void main() {
	vec3 DiffuseColor = (UseRawColor ? RawColor : texture(DiffuseSampler, UV.st)).rgb;
	vec3 L = normalize(LightPos - WorldPos);
	vec3 V = normalize(CameraPos - WorldPos);
	float NdotL = dot(Normal, L);
	vec3 R = normalize(NdotL * Normal * 2.0 -L);
	float Dis = length(vec3(LightPos - WorldPos));
	float Ambient = 0.15;
	float Diffuse = max(NdotL,0.0f);
	float Specular = max(pow(dot(R, V), 1.0),0.0);
	vec3 Light = (Ambient + Diffuse + Specular) * LightIntensity * LightColor;
	OutColor = vec4(DiffuseColor * Light, 1.0);
}