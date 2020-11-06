#version 300 es
 
// fragment shaders don't have a default precision so we need
// to pick one. highp is a good default. It means "high precision"
precision highp float;
precision highp sampler3D;
 
uniform sampler2D WorldPosSampler;
uniform sampler2D DiffuseSampler;
uniform sampler2D NormalSampler;
uniform sampler2D SNormalSampler;
uniform sampler2D TexCoordSampler;
uniform sampler2D CurvatureSampler1;
uniform sampler2D CurvatureSampler2;
uniform sampler2D CurvatureSampler3;
uniform sampler3D HatchingSampler;

uniform int NumHatchingSlices;
uniform float HatchingSliceCoord;

out vec4 OutColor;

void main() {
	float PI = 3.1415926;

	ivec2 ScreenTexutreSize = textureSize(WorldPosSampler, 0);
	ivec2 HatchingTexutreSize = textureSize(HatchingSampler, 0).xy;
	vec2 ScreenSampleUV = gl_FragCoord.xy / vec2(ScreenTexutreSize);
	vec2 HatchingSampleUV = gl_FragCoord.xy / vec2(HatchingTexutreSize);
	
	vec3 Color = vec3(1.0, 1.0, 1.0);
	mat2 rot;
	float angle;
	vec3 CurvatureDir;
	vec3 HatchingColor;
	float SliceCoord = (HatchingSliceCoord - 0.5) / float(NumHatchingSlices);

	HatchingSampleUV = gl_FragCoord.xy / vec2(HatchingTexutreSize);
	CurvatureDir = texture(CurvatureSampler1, ScreenSampleUV).rgb;
	angle = atan(CurvatureDir.y, CurvatureDir.x);
	angle += PI / 4.0;
	rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
	HatchingSampleUV = rot * HatchingSampleUV;

	HatchingColor = texture(HatchingSampler, vec3(HatchingSampleUV * 2.0, SliceCoord)).rgb;
	Color = min(Color, length(CurvatureDir) > 0.0 ? HatchingColor : vec3(1.0));
//	Color += vec3(sin(HatchingSampleUV.x * 100.0));
	
	HatchingSampleUV = gl_FragCoord.xy / vec2(HatchingTexutreSize);
	CurvatureDir = texture(CurvatureSampler2, ScreenSampleUV).rgb;
	angle = atan(CurvatureDir.y, CurvatureDir.x);
	angle += PI / 4.0;
	rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
	HatchingSampleUV = rot * HatchingSampleUV;

	HatchingColor = texture(HatchingSampler, vec3(HatchingSampleUV * 2.0, SliceCoord)).rgb;
	Color = min(Color, length(CurvatureDir) > 0.0 ? HatchingColor : vec3(1.0));
//	Color += vec3(sin(HatchingSampleUV.x * 100.0));

	HatchingSampleUV = gl_FragCoord.xy / vec2(HatchingTexutreSize);
	CurvatureDir = texture(CurvatureSampler3, ScreenSampleUV).rgb;
	angle = atan(CurvatureDir.y, CurvatureDir.x);
	angle += PI / 4.0;
	rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
	HatchingSampleUV = rot * HatchingSampleUV;

	HatchingColor = texture(HatchingSampler, vec3(HatchingSampleUV * 2.0, SliceCoord)).rgb;
	Color = min(Color, length(CurvatureDir) > 0.0 ? HatchingColor : vec3(1.0));

//	Color += vec3(sin(HatchingSampleUV.x * 100.0));


//	OutColor = length(CurvatureDir) > 0.0? vec4(vec3(sin(HatchingSampleUV.x * 100.0)), 1.0): vec4(1.0);
//	OutColor = length(CurvatureDir) > 0.0? vec4(((CurvatureDir) + 1.0) / 2.0 , 1.0): vec4(1.0);
//	OutColor = length(CurvatureDir) > 0.0? vec4((CurvatureDir + 1.0) / 2.0 , 1.0): vec4(1.0);
//	OutColor = length(CurvatureDir) > 0.0? vec4(vec3(angle / 5.0) , 1.0): vec4(1.0);
//	OutColor = length(CurvatureDir) > 0.0? vec4(vec3((angle + PI) / 2.0 / PI), 1.0): vec4(1.0);
//	OutColor = vec4(vec3(sin(angle)), 1.0);
	OutColor = vec4(Color, 1.0);
}