import {
	resizeCanvasToDisplaySize,
	createShader,
	createProgram,
	hexToRgb,
	parsePatternStr,
	ROWS_NUM,
} from './helpers.js';

const canvas = document.querySelector('#canvas');
const state = document.querySelector('#state');

/** @type {WebGL2RenderingContext} */
const gl = canvas.getContext('webgl2');

let timeLocation;
let colorLocation;
let isPaused = false;
let mouseDownListener;
let mouseMoveListener;
let mouseUpListener;
let keydownListener;
let wheelListener;
let pointSizeLocation;
let zoomLocation;
let zoomOriginLocation;

async function setupGl() {
	const positionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

	resizeCanvasToDisplaySize(gl.canvas, 1);

	gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

	gl.enable(gl.BLEND);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

	const vertexShaderSource = await fetch(
		'./src/shaders/vertex.glsl'
	).then((response) => response.text());
	const fragmentShaderSource = await fetch(
		'./src/shaders/fragment.glsl'
	).then((response) => response.text());

	const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
	const fragmentShader = createShader(
		gl,
		gl.FRAGMENT_SHADER,
		fragmentShaderSource
	);

	const program = createProgram(gl, vertexShader, fragmentShader);
	gl.useProgram(program);

	const vao = gl.createVertexArray();
	gl.bindVertexArray(vao);

	const positionAttributeLocation = gl.getAttribLocation(program, 'aPosition');
	const opacityAttributeLocation = gl.getAttribLocation(program, 'aOpacity');
	const resolutionUniformLocation = gl.getUniformLocation(
		program,
		'iResolution'
	);
	timeLocation = gl.getUniformLocation(program, 'iTime');
	pointSizeLocation = gl.getUniformLocation(program, 'uPointSize');
	colorLocation = gl.getUniformLocation(program, 'uColor');
	zoomLocation = gl.getUniformLocation(program, 'uZoom');
	zoomOriginLocation = gl.getUniformLocation(program, 'uZoomOrigin');

	gl.vertexAttribPointer(
		positionAttributeLocation,
		2,
		gl.FLOAT,
		false,
		3 * Float32Array.BYTES_PER_ELEMENT,
		0
	);
	gl.vertexAttribPointer(
		opacityAttributeLocation,
		1,
		gl.FLOAT,
		false,
		3 * Float32Array.BYTES_PER_ELEMENT,
		2 * Float32Array.BYTES_PER_ELEMENT
	);

	gl.enableVertexAttribArray(positionAttributeLocation);
	gl.enableVertexAttribArray(opacityAttributeLocation);

	gl.uniform2f(
		resolutionUniformLocation,
		gl.canvas.clientWidth,
		gl.canvas.clientHeight
	);
	gl.uniform1f(timeLocation, 1);
	// gl.uniformMatrix3fv(transformLocation, false, getTransform(0, 0));
	gl.uniform1f(zoomLocation, 0);

	const color = hexToRgb('#e74c3c');
	gl.uniform3f(colorLocation, color.r * 1.2, color.g * 1.2, color.b * 1.2);
}

const GAP = 40 / ROWS_NUM;

async function main() {
	await setupGl();

	game();
}

function game() {
	let isMouseDown = false;

	const side = gl.canvas.clientHeight / ROWS_NUM;
	const colsNum = Math.floor(gl.canvas.clientWidth / side);
	const rowOffset = (gl.canvas.clientHeight - side * ROWS_NUM) / 2;
	const colOffset = (gl.canvas.clientWidth - side * colsNum) / 2;

	const squares = [];

	let cells = new Array(ROWS_NUM * colsNum).fill(0);
	const newCells = new Array(ROWS_NUM * colsNum).fill(0);

	gl.uniform1f(pointSizeLocation, side - GAP);

	for (let i = 0; i < ROWS_NUM; i++) {
		for (let j = 0; j < colsNum; j++) {
			const square = [
				side / 2 + j * side + colOffset,
				side / 2 + i * side + rowOffset,
				1,
			];

			squares.push(square);
		}
	}

	const coordinates = new Float32Array(squares.flat());

	const trianglesCount = ROWS_NUM * colsNum;

	let baseOpacity = 0;

	const backgroundColorRgb = hexToRgb('#222222');
	gl.clearColor(
		backgroundColorRgb.r,
		backgroundColorRgb.g,
		backgroundColorRgb.b,
		1.0
	);

	draw();

	let prevCellIndex;

	function generateRandom() {
		for (let i = 0; i < cells.length; i++) {
			cells[i] = Math.random() < 0.7 ? 0 : 1;
			newCells[i] = cells[i];
		}
		draw();
	}

	function updateCell(mouseX, mouseY, shift) {
		const x = Math.floor((mouseX - colOffset) / side);
		const y = Math.floor((mouseY - rowOffset) / side);

		if (x > colsNum - 1 || y > ROWS_NUM - 1 || x < 0 || y < 0) {
			return;
		}

		const index = colsNum * y + x;

		if (prevCellIndex !== index) {
			cells[index] = shift ? 0 : 1;
			newCells[index] = cells[index];
			prevCellIndex = index;
			draw();
		}
	}
	let currentOffsetX = 0;
	let currentOffsetY = 0;
	let scale = 1;

	mouseDownListener = (event) => {
		isMouseDown = true;

		updateCell(
			event.clientX / scale + currentOffsetX,
			event.clientY / scale + currentOffsetY,
			event.shiftKey
		);
	};

	mouseUpListener = () => {
		isMouseDown = false;
		prevCellIndex = -1;
	};

	mouseMoveListener = (event) => {
		if (isMouseDown) {
			updateCell(
				event.clientX / scale + currentOffsetX,
				event.clientY / scale + currentOffsetY,
				event.shiftKey
			);
		}
	};

	const width = gl.canvas.clientWidth;
	const height = gl.canvas.clientHeight;
	let zoomCount = 0;
	wheelListener = (event) => {
		if (event.shiftKey) {
			if (event.deltaY > 0 && baseOpacity > 0) {
				baseOpacity -= 0.01;
				draw();
			} else if (event.deltaY < 0 && baseOpacity < 0.5) {
				baseOpacity += 0.01;
				draw();
			}
		} else {
			if (event.deltaY > 0 && zoomCount > 0) {
				zoomCount -= 0.1;
				currentOffsetX -=
					(((2 * event.clientX) / width - 1) * Math.exp(zoomCount) - 1) /
					(Math.exp(zoomCount) + 1);
				currentOffsetY -=
					(((2 * event.clientY) / height - 1) * Math.exp(zoomCount) - 1) /
					(Math.exp(zoomCount) + 1);
			} else if (event.deltaY < 0 && zoomCount < 3) {
				zoomCount += 0.1;
				currentOffsetX = Math.abs(-event.clientX * (Math.exp(zoomCount) - 1));
				currentOffsetY = Math.abs(-event.clientY * (Math.exp(zoomCount) - 1));
				// currentOffsetX =
					// (((((2 * event.clientX) / width - 1) * Math.exp(zoomCount) - 1) /
						// (Math.exp(zoomCount) + 1) +
						// 1) *
						// width) /
					// 2;
				// currentOffsetY =
					// (((((2 * event.clientY) / height - 1) * Math.exp(zoomCount) - 1) /
						// (Math.exp(zoomCount) + 1) +
						// 1) *
						// height) /
					// 2;
				scale = Math.exp(zoomCount);
				console.log(scale);
			}
			console.log(currentOffsetX, currentOffsetY);

			if (zoomCount < 0) {
				zoomCount = 0;
			} else if (zoomCount > 3) {
				zoomCount = 3;
			}

			gl.uniform1f(zoomLocation, Math.exp(zoomCount) - 1);
			gl.uniform2f(zoomOriginLocation, event.clientX, event.clientY);
			gl.uniform1f(pointSizeLocation, (side - GAP) * Math.exp(zoomCount));
			draw();
		}
	};

	keydownListener = (event) => {
		if (event.key === 's') {
			if (isPaused) {
				state.classList.remove('state--paused');
				isPaused = false;
				simulate();
			} else {
				state.classList.add('state--paused');
				isPaused = true;
			}
		} else if (event.key === 'r') {
			generateRandom();
		} else if (event.key === 'c') {
			for (let i = 0; i < cells.length; i++) {
				cells[i] = 0;
				newCells[i] = cells[i];
			}
			draw();
			state.classList.add('state--paused');
			isPaused = true;
		}
	};

	canvas.addEventListener('dragover', (event) => {
		const x = Math.floor((event.clientX - colOffset) / side);
		const y = Math.floor((event.clientY - rowOffset) / side);

		if (x > colsNum - 1 || y > ROWS_NUM - 1 || x < 0 || y < 0) {
			return;
		}

		event.preventDefault();
	});

	function drawPattern(mouseX, mouseY, pattern) {
		const x = Math.floor((mouseX - colOffset) / side);
		const y = Math.floor((mouseY - rowOffset) / side);

		const patternColumns = parseInt(pattern.column);
		const patternRows = parseInt(pattern.row);

		const patternMatrix = parsePatternStr(
			pattern.code,
			patternColumns,
			patternRows
		);

		for (let i = 0; i < patternRows; i++) {
			for (let j = 0; j < patternColumns; j++) {
				setCell(
					x + j - Math.floor(patternColumns / 2),
					y + i - Math.floor(patternRows / 2),
					patternMatrix[i][j]
				);
			}
		}

		draw();
	}

	canvas.addEventListener('drop', (event) => {
		const pattern = JSON.parse(event.dataTransfer.getData('patternData'));
		drawPattern(event.clientX, event.clientY, pattern);
	});

	canvas.addEventListener('mouseup', mouseUpListener);
	canvas.addEventListener('mousemove', mouseMoveListener);
	canvas.addEventListener('wheel', wheelListener);
	canvas.addEventListener('mousedown', mouseDownListener);
	document.addEventListener('keydown', keydownListener);

	generateRandom();

	simulate();

	function draw() {
		gl.clear(gl.COLOR_BUFFER_BIT);

		for (let i = 2; i < coordinates.length; i += 3) {
			coordinates[i] = newCells[Math.floor(i / 3)] || baseOpacity;
		}

		gl.bufferData(gl.ARRAY_BUFFER, coordinates, gl.STATIC_DRAW);
		gl.drawArrays(gl.POINTS, 0, trianglesCount);
	}

	function getCell(x, y) {
		const column = (x + colsNum) % colsNum;
		const row = (y + ROWS_NUM) % ROWS_NUM;
		return cells[colsNum * row + column];
	}

	function setCell(x, y, value) {
		const column = (x + colsNum) % colsNum;
		const row = (y + ROWS_NUM) % ROWS_NUM;
		if (!cells[colsNum * row + column]) {
			cells[colsNum * row + column] = value;
			newCells[colsNum * row + column] = value;
		}
	}

	function simulate() {
		for (let i = 0; i < cells.length; i++) {
			const column = i % colsNum;
			const row = Math.floor(i / colsNum);

			const sum =
				!!getCell(column - 1, row - 1) +
				!!getCell(column, row - 1) +
				!!getCell(column + 1, row - 1) +
				!!getCell(column - 1, row) +
				!!getCell(column + 1, row) +
				!!getCell(column - 1, row + 1) +
				!!getCell(column, row + 1) +
				!!getCell(column + 1, row + 1);

			if (sum === 3 && cells[i] === 0) {
				newCells[i] = 1;
			} else if (cells[i] === 1) {
				if (sum < 2) {
					newCells[i] = 0;
				} else if (sum > 3) {
					newCells[i] = 0;
				}
			}
		}

		cells = [...newCells];

		draw();

		if (!isPaused) {
			setTimeout(simulate, 80);
		}
	}
}

function getTransform(tx, ty) {
	// prettier-ignore
	return [
		1, 0, 0,
		0, 1, 0,
		tx, ty, 1
	];
}

function getSquare(x, y, width, height, opacity) {
	// prettier-ignore
	return [
		x, y, opacity,
		width, y, opacity,
		x, height, opacity,
		x, height, opacity,
		width, y, opacity,
		width, height, opacity
	];
}

main();
