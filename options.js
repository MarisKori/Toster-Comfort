let background = chrome.extension.getBackgroundPage();

function init_checkbox(name) {
	let e = document.getElementById(name);
	e.checked = background.localStorage[name]==1;
	e.addEventListener("change", (e) => {
		background.localStorage[name] = e.target.checked?1:0;
	});
}

let textarea_blacklist, blacklist, textarea_conditions, condlist;
function update_options() {
	if (textarea_blacklist.value != blacklist) {
		blacklist = textarea_blacklist.value;
		background.localStorage.tag_blacklist = blacklist;
		background.update_blacklist();
	}
	if (textarea_conditions.value != condlist) {
		condlist = textarea_conditions.value;
		background.localStorage.all_conditions = condlist;
		background.update_conditions();
	}
}

function checkConditionSyntaxError() {
	if (textarea_conditions.value != condlist) {
		update_options();
		document.getElementById('cond_error').innerHTML = background.cond_update_error_string;
	}
}

document.addEventListener('DOMContentLoaded', function () {
	const manifest = chrome.runtime.getManifest();
	const version = document.getElementById('current_version');
	version.innerHTML = '<b>Версия: v'+manifest.version+'</b>';
	
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
	init_checkbox("save_form_to_storage");
	init_checkbox("make_dark");
	
	textarea_blacklist = document.getElementById('tag_blacklist');
	if (background.localStorage.tag_blacklist) {
		blacklist = background.localStorage.tag_blacklist;
		textarea_blacklist.value = blacklist;
	}

	textarea_conditions = document.getElementById('all_conditions');
	if (background.localStorage.all_conditions) {
		condlist = background.localStorage.all_conditions;
		textarea_conditions.value = condlist;
	}
	setInterval(checkConditionSyntaxError, 1000);

	//Habr
	init_checkbox("move_posttime_down");
	init_checkbox("move_stats_up");
	init_checkbox("hide_comment_form_by_default");
	
	window.onblur = update_options;
});

