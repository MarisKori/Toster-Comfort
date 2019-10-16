let background = chrome.extension.getBackgroundPage();

function init_checkbox(name,options) {
	let e = document.getElementById(name);
	e.checked = background.localStorage[name]==1;
	if (options && options.init) options.init(e);
	e.addEventListener("change", (e) => {
		background.localStorage[name] = e.target.checked?1:0;
		if (options && options.update) background[options.update](e.target.value);
		if (options && options.update_fn) options.update_fn(e.target); //e.target?
	});
	if (!options) return e;
	if (options.master || options.antimaster || options.master2) { //Более главная галка должна быть активна, чтобы эта имела смысл
		let master = options.master && document.getElementById(options.master);
		let master2 = options.master2 && document.getElementById(options.master2);
		let antimaster = options.antimaster && document.getElementById(options.antimaster);
		let disabled = false;
		function updateCheckbox() {
			let status_disabled = master && (!master.checked || master.disabled)
				|| master2 && (!master2.checked || master2.disabled)
				|| antimaster && antimaster.checked; // !antimaster.disabled;
			if (status_disabled == disabled) return;
			e.disabled = status_disabled;
			disabled = status_disabled;
			e.parentNode.className = disabled ? "disabled" : ""; //update color if element is disabled or not
			if(e.chili) e.chili.forEach(e=>e.updateCheckbox());
		}
		if (master &&(!master.checked || master.disabled)) e.disabled = true;
		if (master2 &&(!master2.checked || master2.disabled)) e.disabled = true;
		updateCheckbox();
		setTimeout(updateCheckbox,0);
		e.updateCheckbox=updateCheckbox;
		if (master) {
			master.addEventListener("change", updateCheckbox);
			master.chili=master.chili||[];
			master.chili.push(e);
		}
		if (master2) {
			master2.addEventListener("change", updateCheckbox);
			master2.chili=master2.chili||[];
			master2.chili.push(e);
		}
		if (antimaster) {
			antimaster.addEventListener("change", updateCheckbox);
			antimaster.chili=antimaster.chili||[];
			antimaster.chili.push(e);
		}
	}
	return e;
}

let textarea_blacklist, blacklist, textarea_conditions, condlist, textarea_userlist, userlist;
function update_options() { console.log('update');
	if (textarea_blacklist.value != blacklist) {
		blacklist = textarea_blacklist.value;
		background.localStorage.tag_blacklist = blacklist;
		background.update_blacklist();
	}
	if (textarea_userlist.value != userlist) {
		userlist = textarea_userlist.value;
		background.localStorage.user_blacklist = userlist;
		background.update_user_blacklist();
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
	version.innerHTML = '<b>Версия: v'+(manifest.version_name || manifest.version)+'</b>';

	init_checkbox("show_honor");
	init_checkbox("show_cnt_questions");
	init_checkbox("show_cnt_answers");
	init_checkbox("show_perc_solutions");
	init_checkbox("sol_honor_replace",{master:'show_honor'});
	init_checkbox("show_perc_sol_marks");
	init_checkbox("old_perc_sol_marks",{update:'clean_db_users'});
	init_checkbox("show_respect");
	init_checkbox("show_user_reg_date");
	//init_checkbox("show_user_reg_toster");
	//init_checkbox("show_user_reg_min",{master:'show_user_reg_date',master2:'show_user_reg_toster'});

	
	init_checkbox("cut_karma");
	init_checkbox("hide_sol_button");
	init_checkbox("swap_buttons");
	init_checkbox("minify_names");
	init_checkbox("show_habr");
	init_checkbox("hide_word_karma");
	init_checkbox("show_name");
	init_checkbox("show_nickname");
	init_checkbox("show_psycho");
	init_checkbox("psycho_replace",{master:'show_psycho'});
	init_checkbox("psycho_tags",{master:'show_psycho'});
	init_checkbox("psycho_summary",{master:'show_psycho'});
	init_checkbox("psycho_not_myself",{master:'show_psycho'});
	init_checkbox("psycho_hide_comments",{master:'show_psycho'});
	init_checkbox("psycho_hide_same_author",{master:'show_psycho'});
	init_checkbox("psycho_hide_next",{master:'show_psycho'});
	
	
	init_checkbox("use_ctrl_enter");
	init_checkbox("hide_offered_services",{antimaster:'aside_right_noads'});
	init_checkbox("aside_right_noads");
	init_checkbox("aside_right_hide");
	init_checkbox("top24_show",{antimaster:'aside_right_hide'});
	init_checkbox("top24_show_tags",{antimaster:'aside_right_hide',master:'top24_show'});
	init_checkbox("top24_show_author",{antimaster:'aside_right_hide',master:'top24_show'});
	init_checkbox("is_widget",{antimaster:'aside_right_hide'});
	init_checkbox("is_debug",{master:'is_widget'});
	init_checkbox("is_options_button",{master:'is_widget'});
	init_checkbox("is_search",{master:'is_widget'});
	init_checkbox("read_q",{master:'is_widget'});
	init_checkbox("show_rules",{master:'is_widget'});
	init_checkbox("check_online",{master:'is_widget',master2:'faster_page_1'});
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
	init_checkbox("faster_my_feed",{master:'notify_my_feed'});
	init_checkbox("enable_notify_action",{master:"enable_notifications",antimaster:"notify_my_feed",update_fn:e=>{
		let notify_cnt = background.update_conditions();
		checkNotifyCnt(notify_cnt);
		cond_error.innerHTML = background.cond_update_error_string;
	}});
	init_checkbox("faster_page_1",{master:'enable_notify_action'});
	setTimeout(()=>checkNotifyCnt(background.getDbCondLength()),300);
	init_checkbox("show_my_questions");
	init_checkbox("show_my_answers");
	init_checkbox("show_my_comments");
	init_checkbox("show_my_likes");
	init_checkbox("show_my_tags");
	init_checkbox("hidemenu_all_tags");
	init_checkbox("hidemenu_all_users");
	init_checkbox("hidemenu_all_notifications");
	init_checkbox("minify_curator");
	init_checkbox("remove_te_spam");
	init_checkbox("show_status_achiever");
	init_checkbox("show_psycho_over_achiever",{master:'show_status_achiever',master2:'show_psycho'});
	init_checkbox("achiever_replace",{master:'show_status_achiever'});
	init_checkbox("achiever_hide_comments",{master:'show_status_achiever'});
	init_checkbox("achiever_hide_same_author",{master:'show_status_achiever'});
	init_checkbox("achiever_hide_next",{master:'show_status_achiever'});
	init_checkbox("mark_anwers_by_color");
	init_checkbox("mark_answers_count",{master:'mark_anwers_by_color'});
	init_checkbox("add_comment_lines");
	init_checkbox("change_user_background");
	init_checkbox("short_tags");

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

	textarea_userlist = document.getElementById('user_blacklist');
	if (background.localStorage.user_blacklist) {
		userlist = background.localStorage.user_blacklist;
		textarea_userlist.value = userlist;
	}
	init_checkbox("show_ban_info");
	init_checkbox("dont_ban_solutions");
	
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

//------------------------ TABS ----------------

let tab; // заголовок вкладки
let tabContent; // блок содержащий контент вкладки

function hideTabsContent(a) {
	for (var i=a; i<tabContent.length; i++) {
		tabContent[i].classList.remove('show');
		tabContent[i].classList.add("hide");
		tab[i].classList.remove('whiteborder');
	}
}

function showTabsContent(b){
	if (tabContent[b].classList.contains('hide')) {
		hideTabsContent(0);
		tab[b].classList.add('whiteborder');
		tabContent[b].classList.remove('hide');
		tabContent[b].classList.add('show');
	}
}

document.addEventListener('DOMContentLoaded', function () {
	tabContent=document.getElementsByClassName('tabContent');
	tab=document.getElementsByClassName('tab');
	hideTabsContent(1);
	
	document.getElementById('tabs').onclick= function (event) {
		let target=event.target;
		if (target.className=='tab') {
			for (var i=0; i<tab.length; i++) {
				if (target == tab[i]) {
					showTabsContent(i);
					background.localStorage.tab_num = i;
					break;
	}}}}	
	
	let tabs = document.getElementById('tabs');
	let open = document.getElementById('open');
	function updateTabs(bool) {
		if (!background.localStorage.tab_num) background.localStorage.tab_num=2;
		if (bool) {
			for(let i=tab.length-1;i>=0;i--) {
				tabContent[i].appendChild(open.children[i]);
			}
			tabs.style.display = '';
			open.style.display = 'none';
			showTabsContent(background.localStorage.tab_num);
		} else {
			for(let i=0;i<tab.length;i++) {
				open.appendChild(tabContent[i].children[0]);
			}
			tabs.style.display = 'none';
			open.style.display = '';
		}
		background.localStorage.options_tabs = bool?1:0;
	}
	if (background.localStorage.options_tabs==1) updateTabs(true);
	else tabs.style.display = 'none';
	init_checkbox('options_tabs',{update_fn:e=>{
		updateTabs(e.checked);
	}});
});
