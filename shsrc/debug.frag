#version 300 es
 
// fragment shaders don't have a default precision so we need
// to pick one. highp is a good default. It means "high precision"
precision highp float;
 
uniform ivec2 DrawSize;
uniform sampler2D DebugBufferSampler;
out vec4 OutColor;
 
void main() {
	vec2 GBufferUV = gl_FragCoord.xy / vec2(DrawSize);
	vec3 Color = texture(DebugBufferSampler, GBufferUV).rgb;
	OutColor = vec4(Color, 1.0);
}