#version 300 es
 
// fragment shaders don't have a default precision so we need
// to pick one. highp is a good default. It means "high precision"
precision highp float;
 
in vec2 UV;
uniform vec3 LightPos;
uniform ivec2 ScreenSize;
uniform sampler2D WorldPosSampler;
uniform sampler2D DiffuseSampler;
uniform sampler2D NormalSampler;
uniform sampler2D TexCoordSampler;
out vec4 OutColor;
 
void main() {
	vec2 GBufferUV = gl_FragCoord.xy / vec2(ScreenSize);
	vec3 WorldPos = texture(WorldPosSampler, GBufferUV.st).rgb;
	vec3 Diffuse = texture(DiffuseSampler, GBufferUV.st).rgb;
	vec3 Normal = texture(NormalSampler, GBufferUV.st).rgb;
	vec2 TexCoord = texture(TexCoordSampler, GBufferUV.st).rg;
	vec3 L = normalize(vec3(LightPos - WorldPos));
	vec3 Light = (vec3(max(dot(Normal, L),0.0f)) + vec3(0.2,0.2,0.2));
	OutColor = vec4(Diffuse * Light, 1.0);
}