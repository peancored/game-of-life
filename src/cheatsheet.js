const hotkeysListEntries = [
	{
		hotkey: 'r',
		description: 'Generate random state',
	},
	{
		hotkey: 'c',
		description: 'Clear screen',
	},
	{
		hotkey: 'LMB',
		description: '(Left mouse button). Draw cells',
	},
	{
		hotkey: 'Shift + LMB',
		description: '(Left mouse button). Erase cells',
	},
	{
		hotkey: 'mousewheel',
		description: 'Show/hide grid',
	},
	{
		hotkey: 's',
		description: 'Start/stop simulation',
	},
];

window.addEventListener('load', () => {
	const cheatsheet = document.createElement('div');
	cheatsheet.classList.add('cheatsheet', 'cheatsheet--hidden');

	const toggleCheatsheetButton = document.createElement('button');
	toggleCheatsheetButton.textContent = 'Open cheatsheet';

	toggleCheatsheetButton.addEventListener('click', () => {
		if (cheatsheet.classList.contains('cheatsheet--hidden')) {
			cheatsheet.classList.remove('cheatsheet--hidden');
			toggleCheatsheetButton.textContent = 'Close cheatsheet';
		} else {
			cheatsheet.classList.add('cheatsheet--hidden');
			toggleCheatsheetButton.textContent = 'Open cheatsheet';
		}
	});

	cheatsheet.appendChild(toggleCheatsheetButton);

	const hotkeysList = document.createElement('div');
	hotkeysList.classList.add('cheatsheet__hotkeys-list');
	cheatsheet.appendChild(hotkeysList);

	hotkeysListEntries.forEach((entry) => {
		const hotkeyDiv = document.createElement('div');
		const descriptionDiv = document.createElement('div');
		const separatorDiv = document.createElement('div');

		hotkeyDiv.classList.add('cheatsheet__hotkey');
		descriptionDiv.classList.add('cheatsheet__description');
		separatorDiv.classList.add('cheatsheet__separator');

		hotkeyDiv.textContent = entry.hotkey;
		descriptionDiv.textContent = entry.description;

		hotkeysList.appendChild(hotkeyDiv);
		hotkeysList.appendChild(descriptionDiv);
		hotkeysList.appendChild(separatorDiv);
	});

	document.body.appendChild(cheatsheet);
});
