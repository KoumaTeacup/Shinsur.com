#version 300 es
 
in vec3 a_position;
uniform mat4 MatModel;
uniform mat4 MatView;
uniform mat4 MatProj;
out float CameraDepth;
 
void main() {
	mat4 foo = mat4(
		vec4(1.0, 0.0, 0.0, 0.0),
		vec4(0.0, 1.0, 0.0, 0.0),
		vec4(0.0, 0.0, 1.0, 0.0),
		vec4(0.0, 0.0, 1.0, 1.0)
	);
	CameraDepth = (MatView * MatModel * vec4(a_position, 1.0)).z;
	CameraDepth = (MatView * MatModel * vec4(a_position, 1.0)).z;
  gl_Position = MatProj * MatView * MatModel * vec4(a_position, 1.0);
}