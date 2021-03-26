import { ROWS_NUM } from './helpers.js';
import patterns from './patterns-list.js';

const patternsMenu = document.getElementById('patterns');
const patternsContainer = document.getElementById('patterns-container');
const sortSelect = document.getElementById('sort');
const patternsSearch = document.getElementById('search');

patternsMenu.addEventListener('mouseenter', () => {
	patternsMenu.classList.add('hover');
});

patternsMenu.addEventListener('mouseleave', () => {
	patternsMenu.classList.remove('hover');
	patternsSearch.blur();
});

patternsSearch.addEventListener('keydown', (ev) => {
	ev.stopPropagation();
});

patternsSearch.addEventListener('input', () => {
	patternsContainer.innerHTML = getFilteredPatterns(patternsSearch.value);
});

sortSelect.addEventListener('change', () => {
	patternsContainer.innerHTML = getFilteredPatterns(
		patternsSearch.value,
		sortSelect.value
	);
});

window.dragStart = function (event) {
	const patternData = patterns.find(
		(pattern) => pattern.name === event.target.id
	);

	event.dataTransfer.setData('patternData', JSON.stringify(patternData));

	patternsMenu.classList.remove('hover');
};

function getFilteredPatterns(name = '', orderBy = 'name') {
	return patterns
		.filter((p) => parseInt(p.row) < ROWS_NUM)
		.filter((p) => p.name.includes(name))
		.sort((a, b) => {
			switch (orderBy) {
				case 'size-asc':
					return (
						parseInt(a.row) * parseInt(a.column) -
						parseInt(b.row) * parseInt(b.column)
					);
				case 'size-desc':
					return (
						parseInt(b.row) * parseInt(b.column) -
						parseInt(a.row) * parseInt(a.column)
					);
				default:
					return a.name.localeCompare(b.name);
			}
		})
		.map(
			(pattern) => `
		<div id="${
			pattern.name
		}" class="pattern" draggable="true" ondragstart="dragStart(event)">
			<div class="pattern__image">
				${
					pattern.imageDataUrl
						? `<img draggable="false" src="${pattern.imageDataUrl}" alt="image">`
						: '<div class="pattern__image__placeholder"></div>'
				}
			</div>
			<div class="pattern__name">${pattern.name}</div>
			<div class="pattern__size">${pattern.column}x${pattern.row}</div>
			<div class="pattern__description">${pattern.description}</div>
		</div>
	`
		)
		.join('');
}

patternsContainer.innerHTML = getFilteredPatterns();
