var shaderSrc = `#version 300 es
 
// fragment shaders don't have a default precision so we need
// to pick one. highp is a good default. It means "high precision"
precision highp float;
 
// we need to declare an output for the fragment shader
out vec4 outColor;
in vec4 Pos;
 
void main() {
  // Just set the output to a constant reddish-purple
  outColor = Pos;//vec4(0.0, 1.0, 0.5, 1);
}`;module.exports=shaderSrc;