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
	
	// We have to use textureLod with level 0 to prevent mipmapping, due to our stroke texture is strictly devided to multiple regions.
	return (textureLod(TexSampler, SampleLeftBottom / TexSize, 0.0) * (1.0 - Delta.x) +	textureLod(TexSampler, SampleRightBottom / TexSize, 0.0) * Delta.x)
		* (1.0 - Delta.y) + 
		(textureLod(TexSampler, SampleLeftTop / TexSize, 0.0) * (1.0 - Delta.x) + textureLod(TexSampler, SampleRightTop / TexSize, 0.0) * Delta.x)
		* Delta.y;
}

float DrawLine(int Seed, vec2 StrokeSamplerSize, inout vec2 Pos)
{
	// Move the line to the ending point of saved position, creating seamless boarder
	vec2 ShiftedFragCoord = gl_FragCoord.xy;
	float OutputRes = OutputSize.x;
	ShiftedFragCoord.y -= mod(Pos.y, OutputRes);

	float debugPosY = Pos.y;

	// Random Rotation
	vec2 RandomCoord = vec2(float(Seed+1), float(Seed+3));
	float RandFloatY = rand(RandomCoord);
	float angle = RandFloatY * AngleRange;
	ShiftedFragCoord.y += ShiftedFragCoord.y < -32.0 && Pos.y + OutputRes * tan(angle) > OutputRes ? OutputRes : 0.0;
	ShiftedFragCoord = RotateVec2(ShiftedFragCoord, angle);

	ShiftedFragCoord.x += Pos.x;

	// Save the ending position for the next line
	Pos.x = mod(Pos.x + OutputRes / cos(angle), StrokeSamplerSize.x);
	Pos.y = mod(Pos.y + OutputRes * tan(angle), OutputRes);

	// Lerp between 2 stroke sizes
	vec2 SampleUV = ShiftedFragCoord / StrokeSamplerSize;

	float ThinerStroke = floor(StrokeWidth);
	float ThickerStroke = ceil(StrokeWidth);


	SampleUV.y += (ThinerStroke - 8.5) / 8.0;
	SampleUV.y = clamp(SampleUV.y, (ThinerStroke - 9.0) / 8.0, (ThinerStroke - 8.0) / 8.0);
	SampleUV.y = round(SampleUV.y * StrokeSamplerSize.y) / StrokeSamplerSize.y;
	float ThinStrokeValue = SampleBilinear(StrokeSampler, SampleUV).r;

	SampleUV = ShiftedFragCoord / StrokeSamplerSize;
	SampleUV.y += (ThickerStroke - 8.5) / 8.0;
	SampleUV.y = clamp(SampleUV.y, (ThickerStroke - 9.0) / 8.0, (ThickerStroke - 8.0) / 8.0);
	float ThickStrokeValue = SampleBilinear(StrokeSampler, SampleUV).r;

	float alpha = StrokeWidth - ThinerStroke;

	return ThickStrokeValue * alpha + ThinStrokeValue * (1.0 - alpha);
}

void main() {
	float PI = 3.1415926528;

//	vec2 SampleUV = gl_FragCoord.xy / OutputSize * StrokeWidth;
	vec2 StrokeSamplerSize = vec2(textureSize(StrokeSampler, 0));
//	vec2 SampleUV = gl_FragCoord.xy / vec2(textureSize(StrokeSampler, 0));

	float AccumulatedIntensity = 0.0;
	vec4 OutColor[8];
	vec2 LinePos = vec2(0.0, 0.0);
	// Draw Lines
	for (int i = 0; i < NumLinesToDraw; i++)
//	for (int i = 0; i < 7; i++)
	{
		float StrokeIntensity = DrawLine(i, StrokeSamplerSize, LinePos);

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
//		OutColor[i + 1] = vec4(vec3(DrawLine(i, StrokeSamplerSize, LinePos)), 1.0);
	}

	Hatching0 = vec4(1.0, 1.0, 1.0, 1.0);
	Hatching1 = OutColor[1];
	Hatching2 = OutColor[2];
	Hatching3 = OutColor[3];
	Hatching4 = OutColor[4];
	Hatching5 = OutColor[5];
	Hatching6 = OutColor[6];
	Hatching7 = OutColor[7];

//	Hatching0 = OutColor[6];
//	Hatching1 = OutColor[6];
//	Hatching2 = OutColor[6];
//	Hatching3 = OutColor[6];
//	Hatching4 = OutColor[6];
//	Hatching5 = OutColor[6];
//	Hatching6 = OutColor[6];
//	Hatching7 = OutColor[6];
}