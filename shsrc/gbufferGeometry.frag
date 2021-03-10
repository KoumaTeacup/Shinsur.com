#version 300 es
 
// fragment shaders don't have a default precision so we need
// to pick one. highp is a good default. It means "high precision"
precision highp float;
precision highp sampler3D;
 
in vec3 WorldPos;
in vec3 Tanget;
in vec3 Normal;
in vec3 SNormal;
in vec2 UV;
flat in vec4 Curvature1;
flat in vec4 Curvature2;
flat in vec4 Curvature3;
flat in vec3 CurvaturePos1;
flat in vec3 CurvaturePos2;
flat in vec3 CurvaturePos3;
flat in vec2 RandomOffset1;
flat in vec2 RandomOffset2;
flat in vec2 RandomOffset3;

uniform float Roughness;
uniform sampler2D DiffuseSampler;
uniform sampler3D HatchingSampler;
uniform bool UseRawColor;
uniform vec4 RawColor;
uniform float HatchingSampleScale;
uniform vec2 OutputSize;

layout (location = 0) out vec3 WorldPosOut;
layout (location = 1) out vec4 DiffuseOut;
layout (location = 2) out vec3 NormalOut;
layout (location = 3) out vec3 SNormalOut;
layout (location = 4) out vec2 TexCoordOut;
layout (location = 5) out vec4 CurvatureUVOut1;
layout (location = 6) out vec4 CurvatureUVOut2;
layout (location = 7) out vec4 CurvatureUVOut3;

vec2 CalculateHatchingUV(vec2 ScreenPos, vec2 CurvatureDir, vec2 CurvaturePos, vec2 HatchingTexutreSize)
{
	vec2 HatchingSampleUV = (ScreenPos - CurvaturePos) / HatchingTexutreSize;
	float angle = atan(CurvatureDir.y, CurvatureDir.x);
	mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
	return rot * HatchingSampleUV;
}

float CalculatePointEdgeDistance(vec2 Pos, vec2 EdgePos, vec2 EdgeVec)
{
	// (EdgePos + EdgeVec * t - Pos) dot EdgeVec = 0
	// (EdgePos.x + EdgeVec.x * t - Pos.x) * EdgeVec.x + (EdgePos.y + EdgeVec.y * t - Pos.y) * EdgeVec.y = 0
	// (EdgeVec.x ^ 2 + EdgeVec.y ^ 2)t = Pos.x * EdgeVec.x - EdgePos. * EdgeVec.x + Pos.y * EdgeVec.y - EdgePos.y * EdgeVec.y
	float t = (Pos.x * EdgeVec.x - EdgePos.x * EdgeVec.x + Pos.y * EdgeVec.y - EdgePos.y * EdgeVec.y) / (EdgeVec.x * EdgeVec.x + EdgeVec.y * EdgeVec.y);
	vec2 EndPos = EdgePos + EdgeVec * t;
	return distance(EndPos, Pos);
}

void main() {
	WorldPosOut = WorldPos;
	DiffuseOut.rgb = (UseRawColor ? RawColor : texture(DiffuseSampler, UV.st)).rgb;
	DiffuseOut.a = Roughness;
	NormalOut = Normal;
	SNormalOut = SNormal;
	TexCoordOut = UV;

	vec2 HatchingTexutreSize = vec2(textureSize(HatchingSampler, 0).xy);

	// Convert from NDC to screen space, pixel unit;
	vec2 VertexPos1 = (CurvaturePos1.xy + 1.0) / 2.0 * OutputSize;
	vec2 VertexPos2 = (CurvaturePos2.xy + 1.0) / 2.0 * OutputSize;
	vec2 VertexPos3 = (CurvaturePos3.xy + 1.0) / 2.0 * OutputSize;

	float d1 = CalculatePointEdgeDistance(VertexPos1.xy, VertexPos2.xy, VertexPos3.xy - VertexPos2.xy);
	float d2 = CalculatePointEdgeDistance(VertexPos2.xy, VertexPos1.xy, VertexPos3.xy - VertexPos1.xy);
	float d3 = CalculatePointEdgeDistance(VertexPos3.xy, VertexPos1.xy, VertexPos2.xy - VertexPos1.xy);
	float d23 = CalculatePointEdgeDistance(gl_FragCoord.xy, VertexPos2.xy, VertexPos3.xy - VertexPos2.xy);
	float d13 = CalculatePointEdgeDistance(gl_FragCoord.xy, VertexPos1.xy, VertexPos3.xy - VertexPos1.xy);
	float d12 = CalculatePointEdgeDistance(gl_FragCoord.xy, VertexPos1.xy, VertexPos2.xy - VertexPos1.xy);
	float BlendWeight1 = d23 / d1;
	float BlendWeight2 = d13 / d2;
	float BlendWeight3 = d12 / d3;
	
	// Calculate 3 sets of UVs for curvature based hatching sampling
	CurvatureUVOut1 = vec4(CalculateHatchingUV(gl_FragCoord.xy, Curvature1.xy, VertexPos1.xy, HatchingTexutreSize) + RandomOffset1, BlendWeight1, 0.0);
	CurvatureUVOut2 = vec4(CalculateHatchingUV(gl_FragCoord.xy, Curvature2.xy, VertexPos2.xy, HatchingTexutreSize) + RandomOffset2, BlendWeight2, 0.0);
	CurvatureUVOut3 = vec4(CalculateHatchingUV(gl_FragCoord.xy, Curvature3.xy, VertexPos3.xy, HatchingTexutreSize) + RandomOffset3, BlendWeight3, 0.0);
}