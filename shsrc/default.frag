#version 300 es
 
// fragment shaders don't have a default precision so we need
// to pick one. highp is a good default. It means "high precision"
precision highp float;
 
in vec3 WorldPos;
in vec3 Tanget;
in vec3 Normal;
in vec2 UV;
uniform vec3 LightPos;
uniform sampler2D DiffuseSampler;
uniform sampler2D SpecularSampler;
uniform sampler2D NormalSampler;
uniform bool UseRawColor;
uniform vec4 RawColor;
out vec4 OutColor;
 
void main() {
	vec3 L = normalize(vec3(LightPos - WorldPos));
	float Dis = length(vec3(LightPos - WorldPos));
	vec3 Diffuse = (UseRawColor ? RawColor : texture(DiffuseSampler, UV.st)).rgb;
	vec3 Light = (vec3(max(dot(Normal, L),0.0f)) + vec3(0.2,0.2,0.2));
	OutColor = vec4(Diffuse * Light, 1.0);
}