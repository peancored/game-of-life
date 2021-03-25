#version 300 es

precision highp float;

in float colorAlpha;
out vec4 fragColor;

uniform vec3 uColor;
uniform vec2 iResolution;
uniform float iTime;

void main() {
	fragColor = vec4(uColor, colorAlpha);
}
