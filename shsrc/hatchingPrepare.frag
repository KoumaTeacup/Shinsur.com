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

highp float rand(vec2 co)
{
    highp float a = 12.9898;
    highp float b = 78.233;
    highp float c = 43758.5453;
    highp float dt= dot(co.xy ,vec2(a,b));
    highp float sn= mod(dt,3.14);
    return fract(sin(sn) * c);
}

// Interleaved Gradient Noise
//  - Jimenez, Next Generation Post Processing in Call of Duty: Advanced Warfare
//    Advances in Real-time Rendering, SIGGRAPH 2014
// 4 flops + 1 2 frac
float ign(vec2 v) {
    vec3 magic = vec3(0.06711056f, 0.00583715f, 52.9829189f);
    return fract(magic.z * fract(dot(v, magic.xy)));
}

// UE4 PseudoRandom function
float pseudo(vec2 v) {
    v = fract(v/128.)*128.f + vec2(-64.340622f, -72.465622f);
    return fract(dot(v.xyx * v.xyy, vec3(20.390625f, 60.703125f, 2.4281209f)));
}

vec2 RotateVec2(vec2 inVec2, float angle) {
	mat2x2 MaxRot = mat2x2(cos(angle), -sin(angle), sin(angle), cos(angle));
	return MaxRot * inVec2;
}

vec4 SampleBilinear(sampler2D TexSampler, vec2 UV) {
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

//	vec2 SampleUV = gl_FragCoord.xy / OutputSize * StrokeWidth;
	vec2 StrokeSamplerSize = vec2(textureSize(StrokeSampler, 0));
//	vec2 SampleUV = gl_FragCoord.xy / vec2(textureSize(StrokeSampler, 0));

	float AccumulatedIntensity = 0.0;
	vec4 OutColor[8];

	// Draw Lines
	for (int i = 0; i < NumLinesToDraw; i++)
//	for (int i = 0; i < 7; i++)
	{
		// Generating random numbers per line.
		vec2 RandomCoord = vec2(float(i), float(i));
		float RandFloatX = pseudo(RandomCoord);
		RandFloatX *= 0.1;
		float RandFloatY = rand(RandomCoord);
		float RandFloatR = ign(RandomCoord);

		// Apply randomeness to the line posistion
		vec2 ShiftedFragCoord = gl_FragCoord.xy;
		float OutputRes = OutputSize.x;
		ShiftedFragCoord -= vec2(OutputRes * RandFloatY, 0.0);
		ShiftedFragCoord = RotateVec2(ShiftedFragCoord, (RandFloatR * 2.0 - 1.0) * AngleRange);
		ShiftedFragCoord += vec2(OutputRes * RandFloatY, 0.0);
		ShiftedFragCoord = ShiftedFragCoord + vec2(RandFloatX * (StrokeSamplerSize.x - OutputRes * 1.41) + 100.0, -mod(float(i) * 123.45, OutputRes));
		
		vec2 SampleUV = ShiftedFragCoord / StrokeSamplerSize;
		SampleUV = clamp(SampleUV, 0.0, 1.0);

		// Bilienar sample the stroke image with random rotation, sampled value with be a colorless alpha indicating stroke intensity
//		float StrokeIntensity = SampleBilinear(StrokeSampler, SampleUV).r;
		float StrokeIntensity = texture(StrokeSampler, SampleUV).r;
		
		// Inverse the sampled color since pencil is black
		StrokeIntensity = 1.0 - StrokeIntensity;

		// Scale the sampled color with current color on paper, this will soften the strokes so they don't get dark too quickly
		StrokeIntensity *= (1.0 - AccumulatedIntensity) * SourceStrokeScale;

		// Scale the sampled color for first stroke, this reduces intensity with fewer lines, effective increase darkening speed
		StrokeIntensity *= FirstStrokeBias - AccumulatedIntensity > 0.0 ? 0.3/*magic number*/ : 1.0;

		// Accumulate sample on this pixel
		AccumulatedIntensity += StrokeIntensity;
		AccumulatedIntensity = min(1.0, AccumulatedIntensity);

		// Output current value to different layers of our draw buffer, creating uniform layers scaled by number of lines drawn
		OutColor[i * 7 / NumLinesToDraw + 1] = vec4(vec3(max(1.0 - AccumulatedIntensity, 0.0)), 1.0);
//		OutColor[i + 1] = vec4(vec3(max(1.0 - AccumulatedIntensity, 0.0)), 1.0);
	}

	Hatching0 = vec4(1.0, 1.0, 1.0, 1.0);
	Hatching1 = OutColor[1];
	Hatching2 = OutColor[2];
	Hatching3 = OutColor[3];
	Hatching4 = OutColor[4];
	Hatching5 = OutColor[5];
	Hatching6 = OutColor[6];
	Hatching7 = OutColor[7];

//	vec2 RandomCoord = vec2(float(5), float(1));
//	float RandFloatX = pseudo(RandomCoord);
//	float RandFloatY = rand(RandomCoord);
//	float RandFloatR = ign(RandomCoord);
//
//	vec2 ShiftedFragCoord = gl_FragCoord.xy;
//	ShiftedFragCoord = RotateVec2(ShiftedFragCoord, RandFloatR * (AngleRange * 2.0 - AngleRange));
//	ShiftedFragCoord = ShiftedFragCoord + vec2(RandFloatX * (StrokeSamplerSize.x - OutputSize.x * 1.41) + 100.0, -RandFloatY * OutputSize.x);
//	vec2 SampleUV = ShiftedFragCoord / StrokeSamplerSize;
//	SampleUV = clamp(SampleUV, 0.0, 1.0);
//
//	vec4 TestColor = SampleBilinear(StrokeSampler, SampleUV);
	
//	TestColor = texture(StrokeSampler, SampleUV);
//	TestColor = vec4(vec3(rand(gl_FragCoord.xy)), 1.0);
	
//	float val = mod(gl_FragCoord.y / OutputSize.y * 20.0, 1.0);
//	vec4 TestColor = vec4(vec3(val), 1.0);
//	TestColor = vec4(gl_FragCoord.xy / OutputSize.xy, 0.0, 1.0);

//	Hatching0 = TestColor;
//	Hatching1 = TestColor;
//	Hatching2 = TestColor;
//	Hatching3 = TestColor;
//	Hatching4 = TestColor;
//	Hatching5 = TestColor;
//	Hatching6 = TestColor;
//	Hatching7 = TestColor;

//	SampleUV = gl_FragCoord.xy / OutputSize * StrokeWidth;
//	vec4 multiplier = vec4(SampleUV.x, SampleUV.y, 1.0, 1.0);
//
//	Hatching0 *= multiplier;
//	Hatching1 *= multiplier;
//	Hatching2 *= multiplier;
//	Hatching3 *= multiplier;
//	Hatching4 *= multiplier;
//	Hatching5 *= multiplier;
//	Hatching6 *= multiplier;
//	Hatching7 *= multiplier; 
}