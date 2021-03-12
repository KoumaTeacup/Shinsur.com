#version 300 es
 
// fragment shaders don't have a default precision so we need
// to pick one. highp is a good default. It means "high precision"
precision highp float;
 
uniform sampler2D InputSampler;
uniform int ContourNumberLines;
uniform float ContourPeriod;
uniform float ContourAmplify;
out vec4 OutColor;

void main() {
	ivec2 TexutreSize = textureSize(InputSampler, 0);
	vec2 SampleUV = gl_FragCoord.xy / vec2(TexutreSize);

	vec3 Color = vec3(0,0,0);
	for(int i = 0; i < ContourNumberLines; i++)
	{
		float ShakingX = ContourAmplify * sin(SampleUV.x / ContourPeriod * float(TexutreSize.x) / float(TexutreSize.y) + float(i));
		float ShakingY = ContourAmplify * sin(SampleUV.y / ContourPeriod + float(i));
	
		Color += texture(InputSampler, SampleUV + vec2(ShakingY, ShakingX)).rgb / float(ContourNumberLines);
	}

	OutColor = vec4(Color, 1.0);
}