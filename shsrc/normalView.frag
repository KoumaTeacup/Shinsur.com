#version 300 es
 
// fragment shaders don't have a default precision so we need
// to pick one. highp is a good default. It means "high precision"
precision highp float;
 
in vec3 Normal;

out vec4 OutColor;
 
void main() {
	OutColor = vec4(Normal, 1.0);
}