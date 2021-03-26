#version 300 es

in vec2 aPosition;
in float aOpacity;
uniform float uPointSize;
uniform float uZoom;
uniform vec2 uZoomOrigin;

out float colorAlpha;
uniform vec2 iResolution;

void main() {
	mat3 projection = mat3(
		2.0 / iResolution.x, 0.0, 0.0,
		0.0, -2.0 / iResolution.y, 0.0,
		-1.0, 1.0, 1.0
	);
	mat3 scaledProjection = mat3(
		(uZoom + 1.0), 0.0, 0.0,
		0.0, (-uZoom - 1.0), 0.0,
		-1.0, 1.0, 1.0
	);

	vec3 projectedZoomOrigin = projection * vec3(uZoomOrigin, 1);
	vec3 projectedCoords = projection * vec3(aPosition, 1);
	mat3 transformFromOrigin = mat3(
		1, 0, 0,
		0, 1, 0,
		(projectedCoords.x - projectedZoomOrigin.x) * uZoom, (projectedCoords.y - projectedZoomOrigin.y) * uZoom, 1
	);

	gl_Position = vec4(vec3(vec3(transformFromOrigin * projection * vec3(aPosition, 1)).xy, 1), 1);
	colorAlpha = aOpacity;
	gl_PointSize = uPointSize;
}
