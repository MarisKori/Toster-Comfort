let background = chrome.extension.getBackgroundPage();

function init_checkbox(name,options) {
	let e = document.getElementById(name);
	e.checked = background.localStorage[name]==1;
	if (options && options.init) options.init(e);
	e.addEventListener("change", (e) => {
		background.localStorage[name] = e.target.checked?1:0;
		if (options && options.update) background[options.update](e.target.value);
		if (options && options.update_fn) options.update_fn(); //e.target?
	});
	if (!options) return e;
	if (options.master || options.antimaster) { //Более главная галка должна быть активна, чтобы эта имела смысл
		let master = options.master && document.getElementById(options.master);
		let antimaster = options.antimaster && document.getElementById(options.antimaster);
		let disabled = false;
		function updateCheckbox() {
			let status_disabled = master && (!master.checked) // || master.disabled)
				|| antimaster && antimaster.checked; // && !antimaster.disabled;
			if (status_disabled == disabled) return;
			e.disabled = status_disabled;
			disabled = status_disabled;
			e.parentNode.className = disabled ? "disabled" : ""; //update color if element is disabled or not
		}
		if (master &&(!master.checked || master.disabled)) e.disabled = true;
		updateCheckbox();
		setTimeout(updateCheckbox,0);
		if (master) master.addEventListener("change", updateCheckbox);
		if (antimaster) antimaster.addEventListener("change", updateCheckbox);
	}
	return e;
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
		let notify_cnt = background.update_conditions();
		checkNotifyCnt(notify_cnt);
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

let notify_error = false;
let save_notify_cnt;
function checkNotifyCnt(cnt) {
	if (cnt === undefined) cnt = save_notify_cnt;
	if (cnt === undefined) return;
	save_notify_cnt = cnt;
	let e = document.getElementById('enable_notify_action');
	let error = !e.disabled && e.checked && !cnt;
	if (error != notify_error) {
		notify_error = error;
		let err = document.getElementById('na_error');
		err.innerHTML = error ? 'У вас нет ни одного фильтра с действием notify.' : '&nbsp;';
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
	init_checkbox("use_ctrl_enter");
	init_checkbox("hide_offered_services",{antimaster:'aside_right_noads'});
	init_checkbox("aside_right_noads");
	init_checkbox("aside_right_hide");
	init_checkbox("top24_show_tags",{antimaster:'aside_right_hide'});
	init_checkbox("top24_show_author",{antimaster:'aside_right_hide'});
	init_checkbox("hide_solutions");
	init_checkbox("save_form_to_storage");
	init_checkbox("make_dark");
	init_checkbox("show_blue_circle");
	init_checkbox("enable_notifications",{update:'updateNotificationOptions',update_fn:e=>{
		setTimeout(()=>{
			let notify_cnt = background.update_conditions();
			checkNotifyCnt(notify_cnt);
			cond_error.innerHTML = background.cond_update_error_string;
		},0);
	}});
	enable_notifications = document.getElementById('enable_notifications');
	init_checkbox("notify_all",{master:"enable_notifications"});
	init_checkbox("notify_if_inactive",{master:"enable_notifications"});
	init_checkbox("always_notify_my_questions",{master:"enable_notifications",antimaster:"notify_all"});
	init_checkbox("notify_answer_comment",{master:"enable_notifications",antimaster:"notify_all"});
	init_checkbox("notify_about_likes",{master:"enable_notifications",antimaster:"notify_all"});
	init_checkbox("notify_about_solutions",{master:"enable_notifications",antimaster:"notify_all"});
	init_checkbox("notify_mention",{master:"enable_notifications",antimaster:"notify_all"});
	init_checkbox("notify_expert",{master:"enable_notifications",antimaster:"notify_all"});
	init_checkbox("notify_moderator",{master:"enable_notifications",antimaster:"notify_all"});
	init_checkbox("notify_changes",{master:"enable_notifications",antimaster:"notify_all"});
	init_checkbox("notify_my_feed",{master:"enable_notifications",antimaster:"enable_notify_action"});
	init_checkbox("enable_notify_action",{master:"enable_notifications",antimaster:"notify_my_feed",update_fn:e=>{
		let notify_cnt = background.update_conditions();
		checkNotifyCnt(notify_cnt);
		cond_error.innerHTML = background.cond_update_error_string;
	}});
	setTimeout(()=>checkNotifyCnt(background.getDbCondLength()),300);

	//datetime
	init_checkbox("datetime_replace");
	let days = init_checkbox("datetime_days",{
		master:"datetime_replace",
		update:"updateDateTimeDays",
		init:e=>e.value = background.localStorage.datetime_days,
	});
	//days.addEventListener('keydown',()=>setTimeout(()=>{background.updateDateTimeDays(days.value)},0));
	
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
	
	//makeLined(textarea_conditions);

	//Habr
	init_checkbox("move_posttime_down");
	init_checkbox("move_stats_up");
	init_checkbox("hide_comment_form_by_default");
	init_checkbox("habr_fix_lines");
	
	window.onblur = update_options;
});

