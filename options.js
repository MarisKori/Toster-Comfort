let background = chrome.extension.getBackgroundPage();

function init_checkbox(name) {
	let e = document.getElementById(name);
	e.checked = background.localStorage[name]==1;
	e.addEventListener("change", (e) => {
		background.localStorage[name] = e.target.checked?1:0;
	});
}


document.addEventListener('DOMContentLoaded', function () {
	const manifest = chrome.runtime.getManifest();
	document.getElementById('current_version').innerHTML = '<b>Версия: v'+manifest.version+'</b>';
	
	init_checkbox("cut_karma");
	init_checkbox("hide_sol_button");
	init_checkbox("swap_buttons");
	init_checkbox("show_habr");
	init_checkbox("hide_word_karma");
	init_checkbox("show_name");
	init_checkbox("show_nickname");
	
});

