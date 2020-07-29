#version 300 es
 
precision highp float;
precision highp sampler3D;

uniform int NumHatchingSlices;
uniform float HatchingSliceCoord;
uniform vec2 DrawSize;
uniform sampler3D HatchingSampler;
out vec4 OutColor;

void main() {
	float SliceCoord = (HatchingSliceCoord - 0.5) / float(NumHatchingSlices);
	vec3 SampleUV = vec3(gl_FragCoord.xy / DrawSize, SliceCoord);
	OutColor = texture(HatchingSampler, SampleUV);
//	OutColor = vec4(vec3(SliceCoord), 1.0);
}