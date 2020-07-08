#version 300 es
 
// fragment shaders don't have a default precision so we need
// to pick one. highp is a good default. It means "high precision"
precision highp float;
 
// we need to declare an output for the fragment shader
in vec4 WorldPos;
in vec3 Normal;
in vec2 UV;
uniform vec3 LightPos;
uniform sampler2D Sampler;
out vec4 outColor;
 
void main() {
	vec3 L = normalize(vec3(LightPos - WorldPos.xyz));
	float dis = length(vec3(LightPos - WorldPos.xyz));
//	outColor = vec4(dot(Normal, L), 1.0f); //vec4(0.0, 1.0, 0.5, 1);
	outColor  = vec4((vec3(max(dot(Normal, L),0.0f)) + vec3(0.2,0.2,0.2)), 1.0f)  * texture(Sampler, UV.xy); //(dis/10000000.0);
//	outColor = vec4(L/2.0,1.0f) ;
//	outColor = vec4(Normal, 1.0f);
}