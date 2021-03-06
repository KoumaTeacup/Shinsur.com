#version 300 es
 
// fragment shaders don't have a default precision so we need
// to pick one. highp is a good default. It means "high precision"
precision highp float;
 
in vec3 WorldPos;
in vec3 Tanget;
in vec3 Normal;
in vec3 SNormal;
in vec2 UV;
in vec4 Curvature1;
in vec4 Curvature2;
in vec4 Curvature3;

uniform float Roughness;
uniform sampler2D DiffuseSampler;
uniform bool UseRawColor;
uniform vec4 RawColor;

layout (location = 0) out vec3 WorldPosOut;
layout (location = 1) out vec4 DiffuseOut;
layout (location = 2) out vec3 NormalOut;
layout (location = 3) out vec3 SNormalOut;
layout (location = 4) out vec2 TexCoordOut;
layout (location = 5) out vec4 CurvatureOut1;
layout (location = 6) out vec4 CurvatureOut2;
layout (location = 7) out vec4 CurvatureOut3;
 
void main() {
	WorldPosOut = WorldPos;
	DiffuseOut.rgb = (UseRawColor ? RawColor : texture(DiffuseSampler, UV.st)).rgb;
	DiffuseOut.a = Roughness;
	NormalOut = Normal;
	SNormalOut = SNormal;
	TexCoordOut = UV;
	CurvatureOut1 = Curvature1;
	CurvatureOut2 = Curvature2;
	CurvatureOut3 = Curvature3;
}