#version 300 es
 
// fragment shaders don't have a default precision so we need
// to pick one. highp is a good default. It means "high precision"
precision highp float;
 
uniform sampler2D InputSampler;
out vec4 OutColor;

void main() {
	ivec2 TexutreSize = textureSize(InputSampler, 0);
	vec2 SampleUV = gl_FragCoord.xy / vec2(TexutreSize);
	
	int NumberRedraw = 3;

	float Period = 0.05;
	float Amplify = 0.002;

	vec3 Color = vec3(0,0,0);
	for(int i = 0; i < NumberRedraw; i++)
	{
		float ShakingX = Amplify * sin(SampleUV.x / Period * float(TexutreSize.x) / float(TexutreSize.y) + float(i));
		float ShakingY = Amplify * sin(SampleUV.y / Period + float(i));
	
		Color += texture(InputSampler, SampleUV + vec2(ShakingY, ShakingX)).rgb / float(NumberRedraw);
	}

	OutColor = vec4(Color, 1.0);
}