#version 300 es
 
// fragment shaders don't have a default precision so we need
// to pick one. highp is a good default. It means "high precision"
precision highp float;

uniform bool IsHorizontal;
uniform int KernelSize;
uniform float KernelSum;
uniform float Kernel[31];
uniform sampler2D InputSampler;
out vec4 OutColor;
 
void main() {
	int HalfSize = KernelSize / 2;
	float SampleSum = 0.0;
	ivec2 TexutreSize = textureSize(InputSampler, 0);
	for (int i = 0; i < KernelSize; i++){
		vec2 SampleUV;
		SampleUV.x = IsHorizontal ? float(clamp(int(gl_FragCoord.x) - HalfSize + i, 0, TexutreSize.x)) : gl_FragCoord.x;
		SampleUV.y = !IsHorizontal ? float(clamp(int(gl_FragCoord.y) - HalfSize + i, 0, TexutreSize.y)) : gl_FragCoord.y;
		SampleUV /= vec2(TexutreSize);
		vec3 SampleValue = texture(InputSampler, SampleUV).rgb;
		SampleSum += SampleValue.x * Kernel[i];
	}

	OutColor = vec4(vec3(SampleSum/KernelSum), 1.0);
}