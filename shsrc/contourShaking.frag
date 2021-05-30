#version 300 es
 
// fragment shaders don't have a default precision so we need
// to pick one. highp is a good default. It means "high precision"
precision highp float;
 
uniform int NPRWidth;
uniform sampler2D InputSampler;
uniform int ContourNumberLines;
uniform float ContourPeriod;
uniform float ContourAmplify;
uniform int ShadowView;
out vec4 OutColor;

void main() {
	if(NPRWidth > 0 && int(gl_FragCoord.x) < NPRWidth) discard;

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
	OutColor = ShadowView == 0 ? OutColor : vec4(vec3(1.0), 1.0);
}