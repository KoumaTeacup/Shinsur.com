#version 300 es
 
// fragment shaders don't have a default precision so we need
// to pick one. highp is a good default. It means "high precision"
precision highp float;
 
in float CameraDepth;
out vec4 OutColor;
 
void main() {
	OutColor = vec4(vec3(CameraDepth), 1.0);
}