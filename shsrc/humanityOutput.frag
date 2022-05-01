#version 300 es
 
// fragment shaders don't have a default precision so we need
// to pick one. highp is a good default. It means "high precision"
precision highp float;

uniform sampler2D HumanitySampler;
out vec4 OutColor;
 
void main() {
	vec2 OutputUV = gl_FragCoord.xy /  (1920.0, 1080.0);
	vec3 Color = texture(HumanitySampler, OutputUV).rgb;
	OutColor = vec4(Color, 1.0);
}