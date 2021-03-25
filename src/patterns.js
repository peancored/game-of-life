import { ROWS_NUM } from './helpers.js';
import patterns from './patterns-list.js';

const patternsContainer = document.getElementById('patterns-container');

window.dragStart = function (event) {
	const patternData = patterns.find(
		(pattern) => pattern.name === event.target.id
	);

	event.dataTransfer.setData('patternData', JSON.stringify(patternData));
};

patternsContainer.innerHTML = patterns
	.filter((p) => parseInt(p.row) < ROWS_NUM)
	.map(
		(pattern) => `
		<div id="${pattern.name}" class="pattern" draggable="true" ondragstart="dragStart(event)">
			<div class="pattern__image"></div>
			<div class="pattern__name">${pattern.name}</div>
			<div class="pattern__size">${pattern.column}x${pattern.row}</div>
		</div>
	`
	)
	.join('');
