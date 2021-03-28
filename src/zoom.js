export default class Zoom {
	constructor(width, height) {
		this.mProjection = glMatrix.mat3.create();
		this.mTransform = glMatrix.mat3.create();

		glMatrix.mat3.projection(this.mProjection, width, height);
		this.width = width;
		this.height = height;
	}

	calcMove(fromPoint, toPoint) {
		const mInvertedTransform = glMatrix.mat3.create();

		const vViewShift = glMatrix.vec3.fromValues(
			fromPoint[0] - toPoint[0],
			fromPoint[1] - toPoint[1],
			1
		);

		glMatrix.mat3.invert(mInvertedTransform, this.mTransform);

		const vMoveShift = glMatrix.vec3.create();

		const vInvertedViewShift = glMatrix.vec3.create();
		const vInvertedOrigin = glMatrix.vec3.fromValues(0, 0, 1);

		glMatrix.vec3.transformMat3(
			vInvertedViewShift,
			vViewShift,
			mInvertedTransform
		);

		glMatrix.vec3.transformMat3(
			vInvertedOrigin,
			vInvertedOrigin,
			mInvertedTransform
		);

		glMatrix.vec3.subtract(vMoveShift, vInvertedViewShift, vInvertedOrigin);

		glMatrix.mat3.translate(this.mTransform, this.mTransform, [
			vMoveShift[0],
			vMoveShift[1],
		]);
	}

	getProjectedMouse(mouseX, mouseY) {
		const vMouseCoords = glMatrix.vec3.fromValues(mouseX, mouseY, 1);

		const vProjectedMouseCoords = glMatrix.vec3.create();

		glMatrix.vec3.transformMat3(
			vProjectedMouseCoords,
			vMouseCoords,
			this.mProjection
		);

		return vProjectedMouseCoords;
	}

	getInvertedProjectedMouse(vProjectedMouseCoords) {
		const mInvertedTransform = glMatrix.mat3.create();

		glMatrix.mat3.invert(mInvertedTransform, this.mTransform);

		const vInvertedProjectedMouseCoords = glMatrix.vec3.create();

		glMatrix.vec3.transformMat3(
			vInvertedProjectedMouseCoords,
			vProjectedMouseCoords,
			mInvertedTransform
		);

		return vInvertedProjectedMouseCoords;
	}

	getTrueMouseCoords(x, y) {
		const vProjectedMouseCoords = this.getProjectedMouse(x, y);
		const vInvertedProjectedMouseCoords = this.getInvertedProjectedMouse(
			vProjectedMouseCoords
		);

		const vTrueCoords = glMatrix.vec3.create();

		const mUnproject = glMatrix.mat3.create();

		glMatrix.mat3.invert(mUnproject, this.mProjection);

		glMatrix.vec3.transformMat3(
			vTrueCoords,
			vInvertedProjectedMouseCoords,
			mUnproject
		);

		return [vTrueCoords[0], vTrueCoords[1]];
	}

	calcTransform(mouseX, mouseY, scale) {
		const vProjectedMouseCoords = this.getProjectedMouse(mouseX, mouseY);
		const vInvertedProjectedMouseCoords = this.getInvertedProjectedMouse(
			vProjectedMouseCoords
		);

		glMatrix.mat3.scale(this.mTransform, this.mTransform, [scale, scale]);

		const vTransformedInvertedProjectedMouseCoords = glMatrix.vec3.create();

		glMatrix.vec3.transformMat3(
			vTransformedInvertedProjectedMouseCoords,
			vInvertedProjectedMouseCoords,
			this.mTransform
		);

		this.calcMove(
			vProjectedMouseCoords,
			vTransformedInvertedProjectedMouseCoords
		);
	}

	offsetCorners() {
		const screen = [
			glMatrix.vec3.fromValues(0, 0, 1),
			glMatrix.vec3.fromValues(this.width, 0, 1),
			glMatrix.vec3.fromValues(0, this.height, 1),
			glMatrix.vec3.fromValues(this.width, this.height, 1),
		];
		const transformedScreen = new Array(screen.length);

		let brokenCorner = glMatrix.vec3.fromValues(0, 0, 1);
		let goodCorner = glMatrix.vec3.fromValues(0, 0, 1);

		screen.forEach((s, i) => {
			const t = glMatrix.vec3.fromValues(0, 0, 1);
			glMatrix.vec3.transformMat3(t, s, this.mProjection);
			glMatrix.vec3.transformMat3(t, t, this.mTransform);
			transformedScreen[i] = t;

			if (Math.abs(t[0]) < 1 || Math.abs(t[1]) < 1) {
				brokenCorner = t;
				goodCorner = glMatrix.vec3.fromValues(s[0], s[1], 1);
				glMatrix.vec3.transformMat3(goodCorner, s, this.mProjection);
			}
		});

		this.calcMove(goodCorner, brokenCorner);
	}

	getFinalMatrix() {
		const mFinalMatrix = glMatrix.mat3.create();
		glMatrix.mat3.multiply(mFinalMatrix, this.mTransform, this.mProjection);

		return mFinalMatrix;
	}
}
