#version 300 es
 
// fragment shaders don't have a default precision so we need
// to pick one. highp is a good default. It means "high precision"
precision highp float;
 
uniform sampler2D InputSampler;
out vec4 OutColor;

void main() {
	ivec2 TexutreSize = textureSize(InputSampler, 0);
	vec2 SampleUV = gl_FragCoord.xy / vec2(TexutreSize);
	
	OutColor = texture(InputSampler, SampleUV);
}