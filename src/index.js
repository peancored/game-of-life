import {
	resizeCanvasToDisplaySize,
	createShader,
	createProgram,
	hexToRgb,
} from './helpers.js';

const canvas = document.querySelector('#canvas');
const state = document.querySelector('#state');

/** @type {WebGL2RenderingContext} */
const gl = canvas.getContext('webgl2', { antialias: false });

let timeLocation;
let colorLocation;
let isPaused = true;
let mouseDownListener;
let mouseMoveListener;
let mouseUpListener;
let keydownListener;
let wheelListener;

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
	colorLocation = gl.getUniformLocation(program, 'uColor');

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

	const color = hexToRgb('#ecf0f1');
	gl.uniform3f(colorLocation, color.r, color.g, color.b);
}

const ROWS_NUM = 100;
const GAP = 1;

async function main() {
	await setupGl();

	game();
}

function game() {
	let isMouseDown = false;

	const side = Math.floor(gl.canvas.clientHeight / ROWS_NUM);
	const colsNum = Math.floor(gl.canvas.clientWidth / side);
	const rowOffset = Math.floor((gl.canvas.clientHeight - side * ROWS_NUM) / 2);
	const colOffset = Math.floor((gl.canvas.clientWidth - side * colsNum) / 2);

	const squares = [];

	let cells = new Array(ROWS_NUM * colsNum).fill(0);
	const newCells = new Array(ROWS_NUM * colsNum).fill(0);

	for (let i = 0; i < ROWS_NUM; i++) {
		for (let j = 0; j < colsNum; j++) {
			const square = getSquare(
				j * side + GAP + colOffset,
				i * side + GAP + rowOffset,
				side + j * side - GAP + colOffset,
				side + i * side - GAP + rowOffset,
				0
			);

			squares.push(square);
		}
	}

	const coordinates = new Float32Array(squares.flat());

	const trianglesCount = ROWS_NUM * colsNum * 2 * 3;

	let baseOpacity = 0;

	const backgroundColorRgb = hexToRgb('#1e272e');
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

	mouseDownListener = (event) => {
		isMouseDown = true;

		updateCell(event.clientX, event.clientY, event.shiftKey);
	};

	mouseUpListener = () => {
		isMouseDown = false;
		prevCellIndex = -1;
	};

	mouseMoveListener = (event) => {
		if (isMouseDown) {
			updateCell(event.clientX, event.clientY, event.shiftKey);
		}
	};

	wheelListener = (event) => {
		if (event.deltaY > 0 && baseOpacity > 0) {
			baseOpacity -= 0.01;
			draw();
		} else if (event.deltaY < 0 && baseOpacity < 0.5) {
			baseOpacity += 0.01;
			draw();
		}
	};

	keydownListener = (event) => {
		if (event.key === 'p') {
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

	canvas.addEventListener('mouseup', mouseUpListener);
	canvas.addEventListener('mousemove', mouseMoveListener);
	canvas.addEventListener('wheel', wheelListener);
	canvas.addEventListener('mousedown', mouseDownListener);
	document.addEventListener('keydown', keydownListener);

	generateRandom();

	function draw() {
		gl.clear(gl.COLOR_BUFFER_BIT);

		for (let i = 2; i < coordinates.length; i += 3) {
			coordinates[i] = newCells[Math.floor(i / 18)] || baseOpacity;
		}

		gl.bufferData(gl.ARRAY_BUFFER, coordinates, gl.STATIC_DRAW);
		gl.drawArrays(gl.TRIANGLES, 0, trianglesCount);
	}

	function getCell(x, y) {
		const column = (x + colsNum) % colsNum;
		const row = (y + ROWS_NUM) % ROWS_NUM;
		return cells[colsNum * row + column];
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
