
document.addEventListener('DOMContentLoaded', function () {
	const manifest = chrome.runtime.getManifest();
	document.getElementById('current_version').innerHTML = '<b>Версия: v'+manifest.version+'</b>';
});

