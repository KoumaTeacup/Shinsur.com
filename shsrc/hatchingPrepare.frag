#version 300 es
 
// fragment shaders don't have a default precision so we need
// to pick one. highp is a good default. It means "high precision"
precision highp float;

uniform int NumLinesToDraw;
uniform float SourceStrokeScale;
uniform float AngleRange;
uniform float StrokeWidth;
uniform float FirstStrokeBias;
uniform vec2 OutputSize;
uniform sampler2D StrokeSampler;

layout (location = 0) out vec4 Hatching0;
layout (location = 1) out vec4 Hatching1;
layout (location = 2) out vec4 Hatching2;
layout (location = 3) out vec4 Hatching3;
layout (location = 4) out vec4 Hatching4;
layout (location = 5) out vec4 Hatching5;
layout (location = 6) out vec4 Hatching6;
layout (location = 7) out vec4 Hatching7;

float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

vec2 RotateVec2(vec2 inVec2, float angle) {
	mat2x2 MaxRot = mat2x2(cos(angle), -sin(angle), sin(angle), cos(angle));
	return MaxRot * inVec2;
}

vec4 SampleBilinear(vec2 UV, sampler2D TexSampler) {
	vec2 TexSize = vec2(textureSize(TexSampler, 0));
	vec2 SampleLoc = UV * vec2(TexSize);
	vec2 SampleLeftBottom = floor(SampleLoc);
	vec2 SampleLeftTop = SampleLeftBottom + vec2(0.0, 1.0);
	vec2 SampleRightBottom = SampleLeftBottom + vec2(1.0, 0.0);
	vec2 SampleRightTop = SampleLeftBottom + vec2(1.0, 1.0);
	vec2 Delta = SampleLoc - SampleLeftBottom;
	
	return (texture(TexSampler, SampleLeftBottom / TexSize) * (1.0 - Delta.x) +	texture(TexSampler, SampleRightBottom / TexSize) * Delta.x)
		* (1.0 - Delta.y) + 
		(texture(TexSampler, SampleLeftTop / TexSize) * (1.0 - Delta.x) + texture(TexSampler, SampleRightTop / TexSize) * Delta.x)
		* Delta.y;
}

void main() {
	float PI = 3.1415926528;

	vec2 SampleUV = gl_FragCoord.xy / OutputSize * StrokeWidth;

	float AccumulativeColor = 0.0;
	vec4 OutColor[8];

	// Draw Lines
	for (int i = 0; i < NumLinesToDraw; i++)
	{
		// Use per line seed to generate random number
		float Seed = float(i) / float(NumLinesToDraw);
		float RandFloat = rand(vec2(Seed, 1.0 - Seed));

		// Apply randomeness to the line posistion
		SampleUV.y += RandFloat;
		SampleUV.x += 1.0 - RandFloat;

		// Bilienar sample the stroke image with random rotation, sampled value with be a colorless alpha indicating stroke intensity
		float SampleColor = SampleBilinear(RotateVec2(SampleUV, RandFloat * AngleRange * 2.0 - AngleRange), StrokeSampler).a;

		// Scale the sampled color with current color on paper, this will soften the strokes so they don't get dark too quickly
		SampleColor *= (1.0 - AccumulativeColor) * SourceStrokeScale;

		// Scale the sampled color for first stroke, this reduces intensity with fewer lines, effective increase darkening speed
		SampleColor *= FirstStrokeBias - AccumulativeColor > 0.0 ? 0.3/*magic number*/ : 1.0;

		// Accumulate sample on this pixel
		AccumulativeColor += SampleColor;
		AccumulativeColor = min(1.0, AccumulativeColor);

		// Output current value to different layers of our draw buffer, creating uniform layers scaled by number of lines drawn
		OutColor[i * 7 / NumLinesToDraw + 1] = vec4(vec3(max(1.0 - AccumulativeColor, 0.0)), 1.0);
	}

	Hatching0 = vec4(1.0, 1.0, 1.0, 1.0);
	Hatching1 = OutColor[1];
	Hatching2 = OutColor[2];
	Hatching3 = OutColor[3];
	Hatching4 = OutColor[4];
	Hatching5 = OutColor[5];
	Hatching6 = OutColor[6];
	Hatching7 = OutColor[7];
}