import {
	resizeCanvasToDisplaySize,
	createShader,
	createProgram,
	hexToRgb,
	parsePatternStr,
	ROWS_NUM,
} from './helpers.js';
import Zoom from './zoom.js';

const GAP = 40 / ROWS_NUM;

class Game {
	constructor() {
		this.canvas = document.querySelector('#canvas');
		this.state = document.querySelector('#state');
		/** @type {WebGL2RenderingContext} */
		this.gl = this.canvas.getContext('webgl2');
		this.isPaused = false;

		this.side = this.gl.canvas.clientHeight / ROWS_NUM;
		this.colsNum = Math.floor(this.gl.canvas.clientWidth / this.side);
		this.rowOffset = (this.gl.canvas.clientHeight - this.side * ROWS_NUM) / 2;
		this.colOffset =
			(this.gl.canvas.clientWidth - this.side * this.colsNum) / 2;

		this.isMouseDown = false;
		this.baseOpacity = 0;
		this.currentZoomCount = 0;
		this.maxZoom = 10;

		this.createCells();
		console.log(this.colsNum * ROWS_NUM);
	}

	createCells() {
		this.coordinates = new Float32Array(ROWS_NUM * this.colsNum * 3);

		Module.ccall(
			'setup',
			null,
			['number', 'number', 'number', 'number', 'number'],
			[this.colsNum, ROWS_NUM, this.side, this.colOffset, this.rowOffset]
		);
	}

	async setupGl() {
		const positionBuffer = this.gl.createBuffer();
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);

		resizeCanvasToDisplaySize(this.gl.canvas, 1);

		this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);

		this.gl.enable(this.gl.BLEND);
		this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

		const vertexShaderSource = await fetch(
			'./src/shaders/vertex.glsl'
		).then((response) => response.text());
		const fragmentShaderSource = await fetch(
			'./src/shaders/fragment.glsl'
		).then((response) => response.text());

		const vertexShader = createShader(
			this.gl,
			this.gl.VERTEX_SHADER,
			vertexShaderSource
		);
		const fragmentShader = createShader(
			this.gl,
			this.gl.FRAGMENT_SHADER,
			fragmentShaderSource
		);

		const program = createProgram(this.gl, vertexShader, fragmentShader);
		this.gl.useProgram(program);

		const vao = this.gl.createVertexArray();
		this.gl.bindVertexArray(vao);

		const positionAttributeLocation = this.gl.getAttribLocation(
			program,
			'aPosition'
		);
		const opacityAttributeLocation = this.gl.getAttribLocation(
			program,
			'aOpacity'
		);
		const resolutionUniformLocation = this.gl.getUniformLocation(
			program,
			'iResolution'
		);
		this.timeLocation = this.gl.getUniformLocation(program, 'iTime');
		this.pointSizeLocation = this.gl.getUniformLocation(program, 'uPointSize');
		this.colorLocation = this.gl.getUniformLocation(program, 'uColor');
		this.zoomLocation = this.gl.getUniformLocation(program, 'uZoom');
		this.zoomOriginLocation = this.gl.getUniformLocation(
			program,
			'uZoomOrigin'
		);
		this.matrixLocation = this.gl.getUniformLocation(program, 'uMatrix');

		this.gl.vertexAttribPointer(
			positionAttributeLocation,
			2,
			this.gl.FLOAT,
			false,
			3 * Float32Array.BYTES_PER_ELEMENT,
			0
		);
		this.gl.vertexAttribPointer(
			opacityAttributeLocation,
			1,
			this.gl.FLOAT,
			false,
			3 * Float32Array.BYTES_PER_ELEMENT,
			2 * Float32Array.BYTES_PER_ELEMENT
		);

		this.gl.enableVertexAttribArray(positionAttributeLocation);
		this.gl.enableVertexAttribArray(opacityAttributeLocation);

		this.gl.uniform2f(
			resolutionUniformLocation,
			this.gl.canvas.clientWidth,
			this.gl.canvas.clientHeight
		);
		this.gl.uniform1f(this.timeLocation, 1);
		this.gl.uniform1f(this.zoomLocation, 1);

		const color = hexToRgb('#e74c3c');
		this.gl.uniform3f(
			this.colorLocation,
			color.r * 1.2,
			color.g * 1.2,
			color.b * 1.2
		);

		this.zoom = new Zoom(
			this.gl.canvas.clientWidth,
			this.gl.canvas.clientHeight
		);

		this.gl.uniformMatrix3fv(
			this.matrixLocation,
			false,
			this.zoom.getFinalMatrix()
		);

		this.gl.uniform1f(this.pointSizeLocation, this.side - GAP);
	}

	async main() {
		await this.setupGl();

		this.stats = new Stats();
		this.stats.showPanel(0);
		document.body.appendChild(this.stats.dom);

		this.game();
	}

	game() {
		const backgroundColorRgb = hexToRgb('#222222');
		this.gl.clearColor(
			backgroundColorRgb.r,
			backgroundColorRgb.g,
			backgroundColorRgb.b,
			1.0
		);

		this.draw();

		this.setupListeners();

		this.generateRandom();

		this.simulate();
	}

	setupListeners() {
		this.canvas.addEventListener('dragover', this.dragoverListener.bind(this));
		this.canvas.addEventListener('drop', this.dropListener.bind(this));
		this.canvas.addEventListener('mouseup', this.mouseUpListener.bind(this));
		this.canvas.addEventListener(
			'mousemove',
			this.mouseMoveListener.bind(this)
		);
		this.canvas.addEventListener('wheel', this.wheelListener.bind(this));
		this.canvas.addEventListener(
			'mousedown',
			this.mouseDownListener.bind(this)
		);
		document.addEventListener('keydown', this.keydownListener.bind(this));
		document.addEventListener('keyup', this.keyupListener.bind(this));
	}

	keyupListener(event) {
		if (!event.ctrlKey) {
			this.canvas.style.cursor = 'default';
		}
	}

	dragoverListener(event) {
		const x = Math.floor((event.clientX - this.colOffset) / this.side);
		const y = Math.floor((event.clientY - this.rowOffset) / this.side);

		if (x > this.colsNum - 1 || y > ROWS_NUM - 1 || x < 0 || y < 0) {
			return;
		}

		event.preventDefault();
	}

	dropListener(event) {
		const pattern = JSON.parse(event.dataTransfer.getData('patternData'));
		this.drawPattern(
			...this.zoom.getTrueMouseCoords(event.clientX, event.clientY),
			pattern
		);
	}

	wheelListener(event) {
		if (event.shiftKey) {
			if (event.deltaY > 0 && this.baseOpacity > 0) {
				this.baseOpacity -= 0.01;
				this.draw(false);
			} else if (event.deltaY < 0 && this.baseOpacity < 0.5) {
				this.baseOpacity += 0.01;
				this.draw(false);
			}
		} else {
			let zoomCount = 0;

			if (event.deltaY > 0 && this.currentZoomCount > 0) {
				zoomCount = -0.4;
				this.currentZoomCount -= 1;
			} else if (event.deltaY < 0 && this.currentZoomCount < this.maxZoom) {
				zoomCount = 0.4;
				this.currentZoomCount += 1;
			}

			const scale = Math.exp(zoomCount);

			this.zoom.calcTransform(event.clientX, event.clientY, scale);
			this.zoom.offsetCorners();

			this.gl.uniformMatrix3fv(
				this.matrixLocation,
				false,
				this.zoom.getFinalMatrix()
			);
			this.gl.uniform1f(
				this.zoomLocation,
				Math.exp(this.currentZoomCount * 0.4)
			);
			this.gl.uniform2f(this.zoomOriginLocation, event.clientX, event.clientY);

			this.draw(false);
		}
	}

	keydownListener(event) {
		if (event.key === 's') {
			if (this.isPaused) {
				this.state.classList.remove('state--paused');
				this.isPaused = false;
				this.simulate();
			} else {
				this.state.classList.add('state--paused');
				this.isPaused = true;
			}
		} else if (event.key === 'r') {
			this.generateRandom();
		} else if (event.key === 'c') {
			Module.ccall('clear', null, null, null);
			this.draw();
			this.state.classList.add('state--paused');
			this.isPaused = true;
		}

		if (event.ctrlKey && this.canvas.style.cursor === 'default') {
			this.canvas.style.cursor = 'grab';
		}
	}

	mouseDownListener(event) {
		this.isMouseDown = true;

		if (!event.ctrlKey) {
			this.updateCell(
				...this.zoom.getTrueMouseCoords(event.clientX, event.clientY),
				event.shiftKey
			);
		} else {
			this.currentMousePosition = this.zoom.getProjectedMouse(
				event.clientX,
				event.clientY
			);
			this.canvas.style.cursor = 'grabbing';
		}
	}

	mouseUpListener() {
		this.isMouseDown = false;
		this.prevCellIndex = -1;
		this.canvas.style.cursor = 'default';
	}

	mouseMoveListener(event) {
		if (this.isMouseDown) {
			if (!event.ctrlKey) {
				this.updateCell(
					...this.zoom.getTrueMouseCoords(event.clientX, event.clientY),
					event.shiftKey
				);
			} else {
				this.zoom.calcMove(
					this.zoom.getProjectedMouse(event.clientX, event.clientY),
					this.currentMousePosition
				);
				this.currentMousePosition = this.zoom.getProjectedMouse(
					event.clientX,
					event.clientY
				);

				this.zoom.offsetCorners();

				this.gl.uniformMatrix3fv(
					this.matrixLocation,
					false,
					this.zoom.getFinalMatrix()
				);
				this.draw(false);
			}
		}
	}

	drawPattern(mouseX, mouseY, pattern) {
		const x = Math.floor((mouseX - this.colOffset) / this.side);
		const y = Math.floor((mouseY - this.rowOffset) / this.side);

		const patternColumns = parseInt(pattern.column);
		const patternRows = parseInt(pattern.row);

		const patternMatrix = parsePatternStr(
			pattern.code,
			patternColumns,
			patternRows
		);

		for (let i = 0; i < patternRows; i++) {
			for (let j = 0; j < patternColumns; j++) {
				this.setCell(
					x + j - Math.floor(patternColumns / 2),
					y + i - Math.floor(patternRows / 2),
					patternMatrix[i][j]
				);
			}
		}

		this.draw();
	}

	updateCell(mouseX, mouseY, shift) {
		const x = Math.floor((mouseX - this.colOffset) / this.side);
		const y = Math.floor((mouseY - this.rowOffset) / this.side);

		if (x > this.colsNum - 1 || y > ROWS_NUM - 1 || x < 0 || y < 0) {
			return;
		}

		const index = this.colsNum * y + x;

		if (this.prevCellIndex !== index) {
			this.prevCellIndex = index;
			Module.ccall(
				'updateAt',
				null,
				['number', 'number'],
				[index, shift ? 0 : 1]
			);
			this.draw();
		}
	}

	generateRandom() {
		Module.ccall('randomize', null, null, null);
		this.draw();
	}

	setCell(x, y, value) {
		const column = (x + this.colsNum) % this.colsNum;
		const row = (y + ROWS_NUM) % ROWS_NUM;
		Module.ccall(
			'updateAt',
			null,
			['number', 'number'],
			[this.colsNum * row + column, value]
		);
	}

	draw(calculate = true) {
		this.gl.clear(this.gl.COLOR_BUFFER_BIT);

		if (calculate) {
			ccallArrays('updateCoordinates', 'array', null, null, {
				heapOut: 'HEAPF32',
				returnArraySize: ROWS_NUM * this.colsNum * 3,
				resultArray: this.coordinates,
			});

			this.gl.bufferData(
				this.gl.ARRAY_BUFFER,
				this.coordinates,
				this.gl.STATIC_DRAW
			);
		}

		this.gl.drawArrays(this.gl.POINTS, 0, ROWS_NUM * this.colsNum);
	}

	simulate() {
		this.stats.begin();

		Module.ccall('simulate', null, null, null);

		this.draw();

		this.stats.end();

		if (!this.isPaused) {
			// setTimeout(this.simulate.bind(this), 100);
			requestAnimationFrame(this.simulate.bind(this));
		}
	}
}

Module.onRuntimeInitialized = function () {
	const game = new Game();

	game.main();
};
