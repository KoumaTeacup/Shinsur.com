#version 300 es
 
// fragment shaders don't have a default precision so we need
// to pick one. highp is a good default. It means "high precision"
precision highp float;
 
uniform sampler2D InputSampler;
out vec4 OutColor;

float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

void main() {
	ivec2 TexutreSize = textureSize(InputSampler, 0);
	vec2 SampleUV = gl_FragCoord.xy / vec2(TexutreSize);
	
	float fRand = (rand(SampleUV) - 0.5) / 500.0;
	SampleUV += vec2(fRand, fRand);

	vec3 Color = texture(InputSampler, SampleUV).rgb;
	OutColor = vec4(Color, 1.0);
}