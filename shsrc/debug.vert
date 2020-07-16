#version 300 es
 
in vec4 a_position;
in vec2 a_uv;
out vec2 UV;
out float depth;
 
void main() {
	gl_Position = a_position;
	UV = a_uv;
}