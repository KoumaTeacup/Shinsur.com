#version 300 es
 
// fragment shaders don't have a default precision so we need
// to pick one. highp is a good default. It means "high precision"
precision highp float;

in vec3 Normal;
in vec3 SNormal;
uniform bool ShowSmoothed;
out vec4 OutColor;
 
void main() {
	OutColor = ShowSmoothed ? vec4(SNormal, 1.0) : vec4(Normal, 1.0);
}