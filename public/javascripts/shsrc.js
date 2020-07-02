export let srcArray = [{descName: 'default', type: 'frag', data: `#version 300 es
precision highp float;
in vec4 WorldPos;in vec3 Normal;uniform vec3 LightPos;out vec4 outColor;
void main() {	vec3 L = normalize(vec3(LightPos - WorldPos.xyz));	outColor = vec4(vec3(max(dot(Normal, L),0.0f)) + vec3(0.2,0.2,0.2), 1.0f);}`}, {descName: 'default', type: 'vert', data: `#version 300 es
in vec4 a_position;in vec4 a_normal;in vec2 a_uv;uniform mat4 u_matModel;uniform mat4 u_matView;uniform mat4 u_matProj;uniform vec2 u_offset;out vec4 WorldPos;out vec3 Normal;
void main() { WorldPos = u_matModel * a_position;gl_Position = u_matProj * u_matView * WorldPos;Normal = (u_matModel * a_normal).xyz;}`}];