#version 300 es
 
precision highp float;
precision highp sampler3D;

uniform int NumHatchingSlices;
uniform float HatchingSliceCoord;
uniform sampler3D HatchingSampler;
out vec4 OutColor;

void main() {
	ivec3 TexutreSize = textureSize(HatchingSampler, 0);
	float SliceCoord = (HatchingSliceCoord - 0.5) / float(NumHatchingSlices);
	vec3 GBufferUV = vec3(gl_FragCoord.xy / vec2(TexutreSize.xy), SliceCoord);
	OutColor = texture(HatchingSampler, GBufferUV);
//	OutColor = vec4(GBufferUV, 1.0);
}