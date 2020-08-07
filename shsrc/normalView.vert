#version 300 es
 
in vec3 a_position;
in vec4 a_normal;
in vec4 a_snormal;
uniform mat4 MatModel;
uniform mat4 MatView;
uniform mat4 MatProj;
out vec3 Normal;
out vec3 SNormal;

void main() {
  gl_Position = MatProj * MatView * MatModel * vec4(a_position, 1.0);
  Normal = (MatModel * a_normal).xyz;
  SNormal = (MatModel * a_snormal).xyz;
}