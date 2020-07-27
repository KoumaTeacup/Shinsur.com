#version 300 es
 
// fragment shaders don't have a default precision so we need
// to pick one. highp is a good default. It means "high precision"
precision highp float;

layout (location = 0) out vec4 Hatching0;
layout (location = 1) out vec4 Hatching1;
layout (location = 2) out vec4 Hatching2;

void main() {
	Hatching0 = vec4(1.0, 0.0, 0.0, 1.0);
	Hatching1 = vec4(0.0, 1.0, 0.0, 1.0);
	Hatching2 = vec4(0.0, 0.0, 1.0, 1.0);
}