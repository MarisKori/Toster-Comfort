let background = chrome.extension.getBackgroundPage();

function init_checkbox(name) {
	let e = document.getElementById(name);
	e.checked = background.localStorage[name]==1;
	e.addEventListener("change", (e) => {
		background.localStorage[name] = e.target.checked?1:0;
	});
}

let textarea_blacklist, blacklist;
function update_options() {
	if (textarea_blacklist.value != blacklist) {
		blacklist = textarea_blacklist.value;
		background.localStorage.tag_blacklist = blacklist;
		background.update_blacklist();
	}
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
	init_checkbox("hide_offered_services");
	init_checkbox("use_ctrl_enter");
	init_checkbox("top24_show_tags");
	init_checkbox("top24_show_author");
	init_checkbox("hide_solutions");
	
	textarea_blacklist = document.getElementById('tag_blacklist');
	if (background.localStorage.tag_blacklist) {
		blacklist = background.localStorage.tag_blacklist;
		textarea_blacklist.value = blacklist;
	}
	
	window.onblur = update_options;
});

