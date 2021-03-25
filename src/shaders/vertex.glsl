#version 300 es

in vec2 aPosition;
in float aOpacity;

out float colorAlpha;
uniform vec2 iResolution;

void main() {
	mat3 projection = mat3(
		2.0 / iResolution.x, 0.0, 0.0,
		0.0, -2.0 / iResolution.y, 0.0,
		-1.0, 1.0, 1.0
	);
	gl_Position = vec4(projection * vec3(aPosition, 1), 1);
	colorAlpha = aOpacity;
}
