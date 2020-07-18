#version 300 es
 
in vec3 a_position;
uniform mat4 MatModel;
uniform mat4 MatShadowView;
uniform mat4 MatShadowProj;
out float CameraDepth;
 
void main() {
  CameraDepth = (MatShadowView * MatModel * vec4(a_position, 1.0)).z;
  gl_Position = MatShadowProj * MatShadowView * MatModel * vec4(a_position, 1.0);
}