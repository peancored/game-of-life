#version 300 es

precision highp float;

in float colorAlpha;
out vec4 fragColor;

uniform vec3 uColor;
uniform vec2 iResolution;
uniform float iTime;

void main() {
	if (colorAlpha == 0.0) {
		fragColor = vec4(uColor, 0);
	} else if (colorAlpha == 1.0) {
		fragColor = vec4(.18, .80, .44, 1);
	} else if (colorAlpha == 2.0) {
		fragColor = vec4(.95, .77, .06, 1);
	} else if (colorAlpha == 3.0) {
		fragColor = vec4(uColor, 1);
	}
}
