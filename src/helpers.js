export function createShader(
	/** @type {WebGL2RenderingContext} */ gl,
	type,
	source
) {
	const shader = gl.createShader(type);

	gl.shaderSource(shader, source);
	gl.compileShader(shader);

	const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);

	if (success) {
		return shader;
	}

	console.log(gl.getShaderInfoLog(shader));
	gl.deleteShader(shader);
}

export function createProgram(
	/** @type {WebGL2RenderingContext} */ gl,
	vertexShader,
	fragmentShader
) {
	const program = gl.createProgram();

	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);

	gl.linkProgram(program);

	const success = gl.getProgramParameter(program, gl.LINK_STATUS);

	if (success) {
		return program;
	}

	console.log(gl.getProgramInfoLog(program));
	gl.deleteProgram(program);
}

export function resizeCanvasToDisplaySize(canvas, multiplier) {
	multiplier = multiplier || 1;
	const width = (canvas.clientWidth * multiplier) | 0;
	const height = (canvas.clientHeight * multiplier) | 0;
	if (canvas.width !== width || canvas.height !== height) {
		canvas.width = width;
		canvas.height = height;
		return true;
	}
	return false;
}

export function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result
		? {
				r: parseInt(result[1], 16) / 255,
				g: parseInt(result[2], 16) / 255,
				b: parseInt(result[3], 16) / 255,
		  }
		: null;
}

export function parsePatternStr(patternStr, colsNum, rowsNum) {
	const pattern = new Array(rowsNum);

	for (let i = 0; i < pattern.length; i++) {
		pattern[i] = new Array(colsNum).fill(0);
	}

	let i = 0;
	let j = 0;

	const matches = patternStr.match(/\d*(\w|\$|!)/g);

	for (let m = 0; m < matches.length; m++) {
		const number = parseInt(matches[m].match(/\d*/)) || 1;
		const action = matches[m].match(/[ob$!]/)[0];

		if (action === '$') {
			i += number;
			j = 0;
			continue;
		} else if (action === '!') {
			return pattern;
		}

		const alive = action === 'o' ? 1 : 0;

		for (let n = 0; n < number; n++) {
			pattern[i][j] = alive;
			j++;
		}
	}

	return pattern;
}

export const ROWS_NUM = Math.floor(document.body.clientHeight * 2.0);
