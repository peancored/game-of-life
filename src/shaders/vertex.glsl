#version 300 es

in vec2 aPosition;
in float aOpacity;
uniform float uPointSize;
uniform float uZoom;
uniform vec2 uZoomOrigin;
uniform vec2 uNext;

out float colorAlpha;
uniform vec2 iResolution;
uniform mat3 uMatrix;

void main() {
	gl_Position = vec4(uMatrix * vec3(aPosition, 1), 1);
	colorAlpha = aOpacity;
	gl_PointSize = uPointSize * uZoom;
}
