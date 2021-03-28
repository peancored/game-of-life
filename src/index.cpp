#include <iostream>
#include <emscripten/emscripten.h>
#include <thread>
#include <ctime>
#include <cmath>

using namespace std;

extern "C" {
	int * currentGeneration;
	int * nextGeneration;
	int columnsNumber;
	int rowsNumber;
	float * coordinates;

	EMSCRIPTEN_KEEPALIVE void clear() {
		for (int i = 0; i < columnsNumber * rowsNumber; i++) {
			currentGeneration[i] = 0;
			nextGeneration[i] = 0;
		}
	}

	EMSCRIPTEN_KEEPALIVE void updateAt(int index, int state) {
		currentGeneration[index] = state;
		nextGeneration[index] = state;
	}

	EMSCRIPTEN_KEEPALIVE void randomize() {
		srand(time(nullptr));

		for (int i = 0; i < columnsNumber * rowsNumber; i++) {
			currentGeneration[i] = ((float) rand() / (RAND_MAX)) < 0.7 ? 0 : 1;
			nextGeneration[i] = currentGeneration[i];
		}
	}

	EMSCRIPTEN_KEEPALIVE void setup(int colsNum, int rowsNum, float side, float colOffset, float rowOffset) {
		columnsNumber = colsNum;
		rowsNumber = rowsNum;

		currentGeneration = new int[colsNum * rowsNum];
		nextGeneration = new int[colsNum * rowsNum];

		coordinates = new float[colsNum * rowsNum * 3];

		clear();

		for (int i = 0; i < rowsNum; i++) {
			for (int j = 0; j < colsNum; j++) {
				coordinates[3 * (i * colsNum + j)] = side / 2 + j * side + colOffset;
				coordinates[3 * (i * colsNum + j) + 1] = side / 2 + i * side + rowOffset;
				coordinates[3 * (i * colsNum + j) + 2] = 3;
			}
		}
	}

	EMSCRIPTEN_KEEPALIVE int getCell(int x, int y) {
		int column = (x + columnsNumber) % columnsNumber;
		int row = (y + rowsNumber) % rowsNumber;
		return currentGeneration[columnsNumber * row + column] > 0;
	}

	EMSCRIPTEN_KEEPALIVE void simulatePart(int from, int to) {
		for (int i = from; i < to; i++) {
			int column = i % columnsNumber;
			int row = i / columnsNumber;

			int sum =
				getCell(column - 1, row - 1) +
				getCell(column, row - 1) +
				getCell(column + 1, row - 1) +
				getCell(column - 1, row) +
				getCell(column + 1, row) +
				getCell(column - 1, row + 1) +
				getCell(column, row + 1) +
				getCell(column + 1, row + 1);

			if (sum == 3 && currentGeneration[i] == 0) {
				nextGeneration[i] = 1;
			} else if (currentGeneration[i] >= 1) {
				if (sum < 2) {
					nextGeneration[i] = 0;
				} else if (sum > 3) {
					nextGeneration[i] = 0;
				} else if (currentGeneration[i] < 3) {
					nextGeneration[i] += 1;
				}
			}
		}
	}

	int NUM_OF_THREADS = 8;
	thread ** threads = new thread*[NUM_OF_THREADS - 1];

	EMSCRIPTEN_KEEPALIVE void simulate() {
		int total = columnsNumber * rowsNumber;
		for (int i = 0; i < NUM_OF_THREADS - 1; i++) {
			threads[i] = new thread(simulatePart, i * total / NUM_OF_THREADS, (i + 1) * total / NUM_OF_THREADS);
		}

		simulatePart((NUM_OF_THREADS - 1) * total / NUM_OF_THREADS, total);

		for (int i = 0; i < NUM_OF_THREADS - 1; i++) {
			threads[i]->join();
		}

		for (int i = 0; i < NUM_OF_THREADS - 1; i++) {
			delete threads[i];
		}

		for (int i = 0; i < columnsNumber * rowsNumber; i++) {
			currentGeneration[i] = nextGeneration[i];
		}
	}

	EMSCRIPTEN_KEEPALIVE float * updateCoordinates() {
		for (int i = 2; i < columnsNumber * rowsNumber * 3; i += 3) {
			coordinates[i] = currentGeneration[i / 3];
		}

		auto arrayPtr = &coordinates[0];
		return arrayPtr;
	}
}
