#version 300 es
 
// fragment shaders don't have a default precision so we need
// to pick one. highp is a good default. It means "high precision"
precision highp float;
 
uniform ivec2 DrawSize;
uniform sampler2D FramebufferSampler;
out vec4 OutColor;
 
void main() {
	vec2 GBufferUV = gl_FragCoord.xy / vec2(DrawSize);
	vec3 Color = texture(FramebufferSampler, GBufferUV.xy).rgb;
	OutColor = vec4(GBufferUV,0.0, 1.0);
	OutColor = vec4(texture(FramebufferSampler, GBufferUV.xy).rgb, 1.0);
}