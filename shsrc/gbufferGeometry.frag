#version 300 es
 
// fragment shaders don't have a default precision so we need
// to pick one. highp is a good default. It means "high precision"
precision highp float;
 
in vec3 WorldPos;
in vec3 Tanget;
in vec3 Normal;
in vec2 UV;

uniform float Roughness;
uniform sampler2D DiffuseSampler;
uniform bool UseRawColor;
uniform vec4 RawColor;

layout (location = 0) out vec3 WorldPosOut;
layout (location = 1) out vec4 DiffuseOut;
layout (location = 2) out vec3 NormalOut;
layout (location = 3) out vec2 TexCoordOut;
 
void main() {
	WorldPosOut = WorldPos;
	DiffuseOut.rgb = (UseRawColor ? RawColor : texture(DiffuseSampler, UV.st)).rgb;
	DiffuseOut.a = Roughness;
	NormalOut = Normal;
	TexCoordOut = UV;
}