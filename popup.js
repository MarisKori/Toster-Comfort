let background = chrome.extension.getBackgroundPage();



document.addEventListener('DOMContentLoaded', function () {
	if (background.localStorage.db) {
		const len = background.localStorage.db.length;
		const perc = Math.round(len / 5000000 * 1000)/10;
		document.body.innerHTML = 'База занимает: '+perc+'%';
	}
});







