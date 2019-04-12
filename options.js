let background = chrome.extension.getBackgroundPage();

function init_checkbox(name,options) {
	let e = document.getElementById(name);
	e.checked = background.localStorage[name]==1;
	e.addEventListener("change", (e) => {
		background.localStorage[name] = e.target.checked?1:0;
		if (options && options.update) background[options.update]();
	});
	if (!options) return;
	if (options.master) { //Более главная галка должна быть активна, чтобы эта имела смысл
		let master = document.getElementById(options.master);
		let disabled = false;
		function updateColor() { //update color if element is disabled or not
			if (e.disabled == disabled) return;
			disabled = e.disabled;
			e.parentNode.className = disabled ? "disabled" : "";
		}
		if (!master.checked || master.disabled) e.disabled = true;
		updateColor();
		master.addEventListener("change", (m) => {
			if(m.target.checked)e.disabled=false;
			else e.disabled=true;
			updateColor();
		});
	}
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

function checkConditionSyntax() { //textarea: 
	if (textarea_conditions.value != condlist) {
		update_options();
		cond_error.innerHTML = background.cond_update_error_string;
	}
}

let cond_error, enable_notifications;
function onLazyUpdate() {
	//check Condition Syntax Errors
	checkConditionSyntax();
	//check background options
	if (!!+background.localStorage.enable_notifications != enable_notifications.checked) {
		enable_notifications.checked = background.localStorage.enable_notifications == 1;
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
	init_checkbox("make_dark");
	init_checkbox("enable_notifications",{update:'updateNotificationOptions'});
	enable_notifications = document.getElementById('enable_notifications');
	init_checkbox("notify_if_inactive",{master:"enable_notifications"});
	init_checkbox("always_notify_my_questions",{master:"enable_notifications"});
	init_checkbox("notify_about_likes",{master:"enable_notifications"});
	init_checkbox("notify_about_solutions",{master:"enable_notifications"});
	
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
	cond_error = document.getElementById('cond_error');
	cond_error.innerHTML = background.cond_update_error_string;
	setInterval(onLazyUpdate, 1000);
	textarea_conditions.addEventListener('keydown',()=>setTimeout(checkConditionSyntax,0));
	textarea_conditions.addEventListener('input',checkConditionSyntax); //for cut/paste and moves of text by mouse
	

	//Habr
	init_checkbox("move_posttime_down");
	init_checkbox("move_stats_up");
	init_checkbox("hide_comment_form_by_default");
	init_checkbox("habr_fix_lines");
	
	window.onblur = update_options;
});

