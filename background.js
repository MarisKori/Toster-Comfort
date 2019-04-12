
function getURL(url,callback, on_fail) {
	//console.log('URL:',url);
	let xhr = new XMLHttpRequest();
	xhr.timeout = 13000;
	xhr.onreadystatechange = function() {
		if (this.readyState == 4) {
			//console.log('success');
			if (this.status != 200) {
				console.log("error", this.status);
				if (on_fail) on_fail();
				return;
			}
			//window[back] = xhr.responseText;
			if(callback)callback(xhr.responseText);
		}
	};
	//xhr.ontimeout = function() {
		//console.log('timeout');
	//}
	xhr.open("GET", url, true);
	xhr.send();
}

const db_clean_steps = [7, 3, 2, 1, 0.5, 0.2];

function clean_db(timeout_days) {
	const timeout = timeout_days *24*60*60*1000;
	//remove pending status
	for(let id in db.user) {
		if (!db.user[id]) {
			delete db.user[id];
			continue;
		}
		delete db.user[id].solutions_pending;
		delete db.user[id].karma_pending;
	}
	//remove users
	let now = (new Date()).getTime();
	for(let id in db.user) {
		let user = db.user[id];
		if (!(now - user.update_time < timeout)) delete db.user[id]; // n days
	}
	//remove questions
	for(let id in db.question) {
		let q = db.question[id];
		//ignore subscribtions
		if (q.sub) {
			if (!(now - q.ut < 400 * 24 * 60 * 60000)) delete db.question[id]; // 1 year
			continue;
		}
		//ut means update_time
		if (!(now - q.ut < timeout)) delete db.question[id]; // n days
	}
}


let saveDB_timer;
function saveDB() {
	if (saveDB_timer !== undefined) clearTimeout(saveDB_timer);
	saveDB_timer = setTimeout(()=>{
		for(let i=0;i<db_clean_steps.length;i++) {
			clean_db(db_clean_steps[i]);
			try {
				localStorage.db = JSON.stringify(db);
				break;
			} catch(e) {
				console.log("Can't save DB");
			}
		}
	},15000);
}

if (localStorage.cut_karma === undefined) localStorage.cut_karma = 1;
//
function updateUser(nickname,timeout) {
	//console.log('update:',nickname);
	if (!nickname) return console.log('No nickname!'); //impossible
	let user = db.user[nickname];
	if (!user) user = db.user[nickname] = {}; //impossible
	user.nickname = nickname;
	let now = (new Date()).getTime();
	let need_update = false;
	if (!(now - user.update_time < (timeout || 24*60*60*1000))) {
		need_update = true;
		user.update_time = now; //error. not updated yet.
	}
	//questions
	if (need_update || user.solutions === undefined && !user.solutions_pending) {
		user.solutions_pending = true;
		saveDB();
		getURL('https://toster.ru/user/'+nickname+'/questions',(text)=>{
			delete user.solutions_pending;
			//solutions
			let r = /\s*(\d+)\s*<\/div>/g; //todo: very very bad, need better algorytm!
			let a;
			let sum = 0;
			while ((a = r.exec(text)) !== null) {
				if (a[1] !== "0") sum++; //count questions with at least 1 answer
			}
			a = text.match(/icon_svg icon_check/g);
			let cnt = a && a.length || 0;
			if (!sum) user.solutions = '0';
			else user.solutions = Math.floor( cnt / sum * 100);
			//stats
			a = text.match(/<li class="inline-list__item inline-list__item_bordered">[\s\S]*<meta itemprop="interactionCount"[\s\S]*<div class="mini-counter__count">(\d+)[\s\S]*<div class="mini-counter__count">(\d+)[\s\S]*<div class="mini-counter__count mini-counter__count-solutions">(\d+)/);
			if (a) {
				user.cnt_q = a[1]; //questions
				user.cnt_a = a[2]; //answers
				user.cnt_s = a[3]; //perc solutions
			} else console.log("Stats not found, user:",nickname);
		});
	}
	//karma & stats from habr
	if (need_update || user.karma === undefined && !user.karma_pending) {
		user.karma_pending = true;
		saveDB();
		getURL('https://habr.com/users/'+nickname+'/',(text)=>{
			delete user.karma_pending;
			let a = /<div class="stacked-counter__value[^>]*>(.*)<\/div>\s*<div class="stacked-counter__label">Карма<\/div>/.exec(text);
			if (a) {
				user.karma = a[1].replace(',','.').replace('–','-');
				let karma = parseFloat(user.karma);
				if (!isNaN(karma)) { // !!!
					if (localStorage.cut_karma == 1) karma = Math.floor(karma);
					user.karma = karma;
				}
			} else {
				user.karma = "read-only";
				//console.log('Karma not found, user:',nickname);
			}
			a = /<span class="tabs-menu__item-counter tabs-menu__item-counter_total" title="Публикации: (\d+)">/.exec(text);
			if (a) {
				user.stat_pub = parseInt(a[1]);
			}
			a = /<span class="tabs-menu__item-counter tabs-menu__item-counter_total" title="Комментарии: (\d+)">/.exec(text);
			if (a) {
				user.stat_comment = parseInt(a[1]);
			}
		}, ()=>{ delete user.karma_pending; user.karma = 'не зарегистр.'; });
	}
}

function parseTags(txt) {
	let tags = {};
	let r = /<a href="https?:\/\/toster\.ru\/tag\/([^">]*)">\s*([\S ]+?)\s*<\/a>/g
	let a = r.exec(txt);
	while (a) {
		tags[a[1]] = a[2];
		a = r.exec(txt);
	}
	return tags;
}

function analyzeQuestion(question_id, now) {
	if (!now) now = (new Date()).getTime();
	let q = {is_pending:true, ut:now};
	db.question[question_id] = q;
	saveDB();
	getURL('https://toster.ru/q/' + question_id, function(text) {
		//get title
		const index_title_str = '<h1 class="question__title" itemprop="name ">';
		let index_title = text.indexOf(index_title_str);
		if (index_title > -1) {
			let index_title2 = text.indexOf("</h1>\n",index_title);
			let txt = text.substring(index_title + index_title_str.length + 1, index_title2).trim();
			if (txt) q.t = txt; //title!
		}
		//get user name
		let index_name = text.indexOf('<meta itemprop="name" content="');
		if (index_name > -1) {
			let index_name2 = text.indexOf('</span>', index_name);
			let txt = text.substr(index_name, index_name2 - index_name);
			let user_name = txt.match(/<meta itemprop=\"name\" content=\"([^"]*)\">/)[1];
			//console.log('user_name',user_name);
			let user_nickname = txt.match(/<meta itemprop=\"alternateName\" content=\"([^"]*)\">/)[1];
			//console.log('user_nickname',user_nickname);
			if (user_nickname) {
				delete q.is_pending;
				q.user_id = user_nickname;
				let user = db.user[user_nickname];
				if (!user) user = db.user[user_nickname] = {};
				user.name = user_name;
				user.nickname = user_nickname;
				updateUser(user_nickname);
			}
		}
		//get question tags
		let index_tags = text.indexOf('<ul class="tags-list">');
		if (index_tags > -1) {
			let index_tags2 = text.indexOf('</ul>', index_tags || 0);
			let txt = text.substr(index_tags, index_tags2 - index_tags);
			q.tags = parseTags(txt);
		}
	});
}

let db;
function reset_db() {
	db = {
		user:{}, // user_id => { name: name, nickname: nickname, ... }
		question:{}, // q_id => { is_pending:bool, user_id:string, ut:integer }
	};
}
reset_db();

function load_db() {
	try {
		db = JSON.parse(localStorage.db);
	} catch(e) {
		//
	}
}
if (localStorage.save_form_to_storage) { //last added option (reset on each update)
	load_db();
}

let outer_tag = ()=>{};

var condition_error_string;
//Prepare environment and call eval()
function checkCondition(cond, current_data) {
	condition_error_string = '';
	//Special function triggered from eval() - check if a question has the tag
	outer_tag = function(s) {
		let tag_lower = s.toLowerCase();
		let tags = current_data.q.tags;
		if (!tags) return false;
		for(let k in tags) {
			if (tags[k].toLowerCase() == tag_lower) return true;
		}
		return false;
	}
	//Environment
	let env;
	if (current_data.u) {
		env = {
			questions: current_data.u.cnt_q || 999,
			answers: current_data.u.cnt_a || 999,
			solutions: current_data.u.solutions || 100,
			karma: current_data.u.karma || 0,
			comments: current_data.u.stat_comment || 0,
			articles: current_data.u.stat_pub || 0,
			nickname: current_data.u.nickname || '',
			//title: ???, //сам текст вопроса нужен ли?
		}
		env.q = env.questions;
		env.a = env.answers;
		env.s = env.solutions;
		env.k = env.karma;
		env.c = env.comments;
		env.publications = env.articles;
		env.p = env.publications;
		env.nick = env.nickname;
		env.n = env.nick;
	} else env = current_data;
	try {
		return eval.lite(cond, env);
	} catch(e) {
		if ((typeof e == 'object') && (typeof e.message == 'string')) condition_error_string = e.message;
		else condition_error_string = e + '';
		return false;
	}
}



chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	if(!db) reset_db(); //imppossible. for debugging
    if (request.type == "getQuestions") {
		let a = {};
		let now = (new Date()).getTime();
		request.arr.forEach(q_id=>{
			let question = db.question[q_id];
			if (question) {
				question.ut = now;
				let tags = question.tags;
				if (tags) {
					for(let k in tags) {
						if (db_tags_blacklist[tags[k].toLowerCase()]) {
							a[q_id] = {hide:true};
							return;
						}
					}
				}
				let user_id = question.user_id;
				let user = user_id && db.user[user_id];
				if (user) {
					let current_data = {q:question, u:user};
					a[q_id] = current_data;
					updateUser(user_id);
					//Проверка доп. условий
					for(let i=0;i<db_conditions.length;i++){
						let rule = db_conditions[i];
						if (checkCondition(rule.cond, current_data)) {
							if (rule.act == 'hide') current_data.hide = true;
							else current_data.color = rule.act;
							break;
						}
					}
				}
				else if (!question.is_pending) analyzeQuestion(q_id, now);
			}
			else analyzeQuestion(q_id, now);
		});
		sendResponse(a);
    } else if (request.type == "getUsers") {
		let u = {};
		for(let nickname in request.arr) {
			let user = db.user[nickname];
			if (user) {
				u[nickname] = user;
			}
			if (request.arr[nickname] === 1) {
				//console.log('Fast update:',nickname);
				updateUser(nickname, 300000);
			}
			else updateUser(nickname);
		}
		sendResponse(u);
	} else if (request.type == "getOptions") {
		let options = {};
		TOSTER_OPTIONS.forEach((opt)=>{
			options[opt] = parseInt(localStorage[opt]);
		});
		sendResponse(options);
	} else if (request.type == "getOptionsHabr") {
		let options = {};
		HABR_OPTIONS.forEach((opt)=>{
			options[opt] = parseInt(localStorage[opt]);
		});
		if (localStorage.habr_fix_lines == 1) {
			options.habr_css = habr_css_fix_lines;
		}
		sendResponse(options);
	} else if (request.type == "getNotifications") {
		let now = (new Date()).getTime();
		if (now - notifications_pause < 30000) { //Выдерживаем паузу.
			sendResponse({}); //Но не обнуляем
			return;
		}
		if (now - tm_browser_load < 60000) { //После загрузки расширения не паникуем, не спамим, молчим.
			arr_notifications = {}; //Сливаем все уведомления в трубу.
		}
		
		getNotifications_last_time = now;
		for(q_id in arr_notifications) { //Чистим от старых
			let item = arr_notifications[q_id];
			if (now - item.tm > 40000) {
				delete arr_notifications[q_id];
			}
		}
		sendResponse(arr_notifications);
		arr_notifications = {};
	} else if (request.type == "disableNotifications") {
		localStorage.enable_notifications = 0;
	} else if (request.type == "tabIsActive") {
		notifications_pause = (new Date()).getTime();
	} else if (request.type == "updateIconNum") {
		chrome.browserAction.setBadgeText({text:""+request.cnt});
	} else if (request.type == "getSubStatus") {
		let qnum = request.qnum;
		let question = db.question[qnum];
		sendResponse(question && !!question.sub);
	} else if (request.type == "setSubStatus") {
		let qnum = request.qnum;
		let question = db.question[qnum];
		if (!question) {
			analyzeQuestion(qnum);
			question = db.question[qnum];
		}
		if (question.sub) {
			delete question.sub;
		} else {
			question.sub = 1;
		}
		question.ut = (new Date()).getTime();
		sendResponse(!!question.sub);
	} else if (request.type == "directQuestionUpdate") {
		if (!request.nickname || !request.q_id) return;
		let q = db.question[request.q_id];
		if (!q) {
			q = {};
			db.question[request.q_id] = q;
		}
		q.user_id = request.nickname;
		if (request.tags_html) q.tags = parseTags(request.tags_html);
		if (request.title) q.t = request.title;
		q.ut = (new Date()).getTime();
	}
});


let TOSTER_OPTIONS = [
	'swap_buttons', 'hide_sol_button', 'show_habr', 'hide_word_karma',
	'show_name', 'show_nickname', 'hide_offered_services', 'use_ctrl_enter',
	'top24_show_tags', 'top24_show_author', 'hide_solutions', 'save_form_to_storage',
	'make_dark', 'enable_notifications', 'notify_if_inactive',
	//'always_notify_my_questions', 'notify_about_likes', 'notify_about_solutions',
];

let HABR_OPTIONS = [
	'move_posttime_down','move_stats_up', 'hide_comment_form_by_default',
];

if (localStorage.always_notify_my_questions === undefined) { //last added option
	//Toster options
	if (localStorage.swap_buttons === undefined) localStorage.swap_buttons=0;
	if (localStorage.hide_sol_button === undefined) localStorage.hide_sol_button=0;
	if (localStorage.show_habr === undefined) localStorage.show_habr=1;
	if (localStorage.hide_word_karma === undefined) localStorage.hide_word_karma=0;
	if (localStorage.show_name === undefined) localStorage.show_name=0;
	if (localStorage.show_nickname === undefined) localStorage.show_nickname=1;
	if (localStorage.hide_offered_services === undefined) localStorage.hide_offered_services=0;
	if (localStorage.use_ctrl_enter === undefined) localStorage.use_ctrl_enter=0;
	if (localStorage.top24_show_tags === undefined) localStorage.top24_show_tags=0;
	if (localStorage.top24_show_author === undefined) localStorage.top24_show_author=1;
	if (localStorage.hide_solutions === undefined) localStorage.hide_solutions=0;
	if (localStorage.save_form_to_storage === undefined) localStorage.save_form_to_storage=0;
	if (localStorage.fixed_a_bug === undefined) localStorage.fixed_a_bug=1; //he-he
	if (localStorage.make_dark === undefined) localStorage.make_dark=0;
	if (localStorage.all_conditions === undefined) localStorage.all_conditions="tag('JavaScript') = #ffc";
	if (localStorage.enable_notifications === undefined) localStorage.enable_notifications=0;
	if (localStorage.notify_if_inactive === undefined) localStorage.notify_if_inactive=0;
	if (localStorage.always_notify_my_questions === undefined) localStorage.always_notify_my_questions=0;
	if (localStorage.notify_about_likes === undefined) localStorage.notify_about_likes=0;
	if (localStorage.notify_about_solutions === undefined) localStorage.notify_about_solutions=0;
	//Habr options
	if (localStorage.move_posttime_down === undefined) localStorage.move_posttime_down=0;
	if (localStorage.move_stats_up === undefined) localStorage.move_stats_up=0;
	if (localStorage.hide_comment_form_by_default === undefined) localStorage.hide_comment_form_by_default=0;
	if (localStorage.habr_fix_lines === undefined) localStorage.habr_fix_lines=0;
}

//--------- DEBUG ---------

function count_obj(obj) {
	let cnt = 0;
	for(let k in obj) cnt++;
	return cnt;
}

// -------------- BLACKLIST -----------

let db_tags_blacklist = {}
function update_blacklist() {
	db_tags_blacklist = {};
	const lines = localStorage.tag_blacklist.split("\n");
	for(let i=0;i<lines.length;i++) {
		const tag = lines[i].trim();
		if (!tag) continue;
		db_tags_blacklist[tag.toLowerCase()] = true;
	}
}
if (localStorage.tag_blacklist) update_blacklist();

// ------------ Дополнительные условия показа вопросов -------------


const isValidAction_image = document.createElement("img");
function isValidAction(stringToTest) {
	if (stringToTest === 'hide') return true;
    if (!stringToTest || stringToTest === 'inherit' || stringToTest === 'transparent') return false;

    let image = isValidAction_image;
    image.style.color = "rgb(0, 0, 0)";
    image.style.color = stringToTest;
    if (image.style.color !== "rgb(0, 0, 0)") { return true; }
    image.style.color = "rgb(255, 255, 255)";
    image.style.color = stringToTest;
    return image.style.color !== "rgb(255, 255, 255)";
}

let example_environment = {
	questions: 1, q:1,
	answers: 1, a:1,
	solutions: 100, s:100,
	karma: 0, k:0,
	comments: 0, c:0,
	articles: 0, publications:0, p:0,
	nickname: 'admin', nick:'admin', n:'admin',
	//title: 'Toster?', t:'Toster?',
}
var cond_update_error_string;
let db_conditions = [];
function update_conditions() {
	cond_update_error_string = '';
	db_conditions = [];
	const lines = localStorage.all_conditions.split("\n");
	for(let i=0;i<lines.length;i++) {
		let rule = lines[i].trim(); //Строка, содержащая отдельное правило
		if (rule.indexOf('//') !== -1) rule = rule.split('//')[0].trim();
		if (!rule) {
			//Пустая строка или комментарий
			continue;
		}
		let eq_idx = rule.lastIndexOf('='); //Последний знак "="
		if (eq_idx < 1 || rule[eq_idx-1] == '=') {
			if(!cond_update_error_string) cond_update_error_string = 'Line #'+(i+1)+': '+rule+' не является правилом.';
			continue;
		}
		let rule_cond_str = rule.substring(0,eq_idx).trim(); //Условие правила - eval(rule_cond_str)
		let rule_action_str = rule.substring(eq_idx+1).trim(); //Действие правила - #ff0 или hide
		if (!rule_action_str) {
			if(!cond_update_error_string) cond_update_error_string = 'Line #'+(i+1)+': не задано действие.';
			continue;
		}
		if (rule_action_str.toLowerCase() == 'hide') rule_action_str = 'hide';
		if (!isValidAction(rule_action_str)) {
			if(!cond_update_error_string) cond_update_error_string = 'Line #'+(i+1)+': '+rule_action_str+' не является цветом или действием.';
			continue;
		}
		db_conditions.push({
			cond: rule_cond_str,
			act: rule_action_str,
		});
		//test condition
		checkCondition(rule_cond_str, example_environment);
		if (condition_error_string && !cond_update_error_string) cond_update_error_string = 'Line #'+(i+1)+': '+condition_error_string;
	}
}
if (localStorage.all_conditions) setTimeout(update_conditions,0); //because eval.lite is not defined yet

//Notofocations

chrome.browserAction.setBadgeBackgroundColor({color:"#777"});
var arr_notifications = {};
let notifications_timer;
let notifications_pause = 0; //Метка активации паузы. 30 секунд нельзя спамить.
const tm_browser_load = (new Date()).getTime();
let getNotifications_last_time = 0; //Последнее обращение страницы.
function updateNotificationOptions() {
	if (notifications_timer !== undefined) {
		clearInterval(notifications_timer);
		notifications_timer = undefined;
	}
	if (localStorage.enable_notifications == 1) {
		notifications_timer = setInterval(()=>{
			//let now = (new Date()).getTime();
			//if (now - getNotifications_last_time < 60000) return; //Страница не отвечает (никакая).
			let xhr = new XMLHttpRequest();
			xhr.open('GET', 'https://toster.ru/my/tracker', true);
			xhr.send();
			xhr.onload = function() {
				let now = (new Date()).getTime();
				if (xhr.status != 200) return;
				//Текущий пользователь
				let current_user;
				if (localStorage.always_notify_my_questions == 1) {
					let m = xhr.response.match(/<a class="user-panel__user-name" href="https:\/\/toster\.ru\/user\/([^"]+)">/);
					if (m) current_user=m[1];
				}
				//Считаем кол-во уведомлений
				if (localStorage.enable_notifications == 1) {
					let cnt = 0;
					let start = xhr.response.indexOf('<ul class="events-list events-list_navbar">');
					let end = xhr.response.indexOf('</ul>',start);
					if (start > -1 && end > -1) {
						let aside_notifications = xhr.response.substring(start,end);
						let m = aside_notifications.match(/<a class="link_light-blue" href="https:\/\/toster\.ru\/my\/tracker">\n.*\n\s*<span>(\d+)<\/span>/m);
						if (m) {
							cnt = m[1]-0;
						} else {
							m = aside_notifications.match(/<li class=/g);
							let li_cnt = m ? m.length : 0;
							cnt = li_cnt;
						}
					}
					chrome.browserAction.setBadgeText({text:""+cnt});
				}
				//Обрезаем и берем главный список
				let start = xhr.response.indexOf('<section class="page__body"');
				let end = xhr.response.indexOf('</section>',start);
				if (start === -1 || end === -1) return console.log('Ошибка парсинга трекера уведомлений');
				let html = xhr.response.substring(start,end);
				let arr_notes = html.match(/toster\.ru\/\q\/\d+\?e=.*/g); //Уведомления
				if (arr_notes) arr_notes.forEach(s=>{
					let m = s.match(/(\s*)<a href="https:\/\/toster\.ru\/\q\/(\d+)\?e=(\d+)[^#]*#?([^>]*)">([^<]+)<\/a>/);
					if (!m) return;
					let spaces = m[1];
					let q_id=m[2]-0;
					let e=m[3]-0;
					let anchor = m[4];
					let what = m[5].trim();
					if (what=='комментарий') what='Новый '+what;
					else if (what=='ответ') {
						//А вот это совсем дикость и не правильно. Говнокод, чё.
						//Мы будем решать, что за тип уведомления, на основе (внимание!) количества пробелов!
						//Если пробелов 8, то это обычный ответ.
						//Если пробелов 16, то это отметка о том, что ответ является решением.
						if (spaces.length==8) {
							what='Новый '+what;
						} else if(sapces.length==16) {
							if (localStorage.notify_about_solutions) what='Выбрано решение';
							else return; //ignore solutions
						} else what='Ответ? (debug:'+spaces.length+')';
					}
					else if (what=='ваш ответ') {
						//Если пробелов 8, то это обычный лайк ответа.
						//Если пробелов 16, то это отметка о том, что ответ является решением.
						if (spaces.length==8) {
							if (localStorage.notify_about_likes) what='Лайк';
							else return; //ignore likes
						} else if(sapces.length==16) {
							if (localStorage.notify_about_solutions) what='Выбрано решение';
							else return; //ignore solutions
						} else what='Ваш ответ? (debug:'+spaces.length+')';
					}
					else if (what=='комментарии') {
						what = 'Вас упомянули';
					}
					else what='Что-то новое ('+what+')';
					let q = db.question[q_id];
					if (!q) {
						analyzeQuestion(q_id, now);
						q = db.question[q_id];
					}
					if (!q.is_pending) q.ut = now;
					if (!q.e || q.e < e) { //Новые данные
						q.e = e;
						if (q.sub || current_user && q.user_id == current_user) { //Подписка на вопрос
							let notif = arr_notifications[q_id];
							if(!notif) {
								notif = {
									q_id:q_id,
									title:q.t,
								};
								arr_notifications[q_id]=notif;
							}
							notif.e = e;
							notif.w = what;
							notif.anchor=anchor;
							notif.tm = now;
						}
					}
				});
				let arr_q = html.match(/<a class="question__title-link" href="https:\/\/toster\.ru\/q\/(\d+)">\n {6}(.*) {4}<\/a>\n/g);
				if (arr_q) arr_q.forEach(s=>{
					let q_id = s.match(/toster\.ru\/\q\/(\d+)/)[1];
					let title = s.substring(s.indexOf("\n")+1,s.indexOf("</a>\n")).trim();
					let q = db.question[q_id];
					if (!q) {
						analyzeQuestion(q_id, now);
						q = db.question[q_id];
					}
					q.t = title; //Быстрый синхронный title
				});
			};
		}, 15000);
	} else {
		chrome.browserAction.setBadgeText({text:""});
	}
}
updateNotificationOptions();

//---------------------- CSS --------------------

const habr_css_fix_lines = `
/* ---------- МАГИЯ --------- /*

/* Магия в комментариях */
.content-list__item_comment  {
    /* Делаем вертикальные линии. */
    border-left: 1px solid #707070;
}

.comment__message {
    /* Делаем отсутп слева, выравнивание по положению ника (на глаз). */
    padding-left: 33px;
    /* В Chrome и Opera 12 - почти идеально. */;
}

.comment__footer {
    /* Кнопку "ответить" тоже сдвигаем вправо, выравниваем. */
    padding-left: 33px;
}

.comment__folding-dotholder {
    /* Удаление точки при наведении на комментарий. Типа спасибо. Возможно, было и удобно кому-то. */
    background: none;
    display: none !important;
}

.content-list__item_comment .content-list__item_comment
.content-list__item_comment .content-list__item_comment
.content-list__item_comment .content-list__item_comment
.content-list__item_comment .content-list__item_comment
.content-list__item_comment .content-list__item_comment
.content-list__item_comment .content-list__item_comment
.content-list__item_comment .content-list__item_comment
.content-list__item_comment .content-list__item_comment
{
    border-left: 1px solid #ff7030;
    /* Делаем 17ю линию другим цветом, т.к. это предел вложенности. */;
}

.content-list__item_comment .content-list__item_comment
.content-list__item_comment .content-list__item_comment
.content-list__item_comment .content-list__item_comment
.content-list__item_comment .content-list__item_comment
.content-list__item_comment .content-list__item_comment
.content-list__item_comment .content-list__item_comment
.content-list__item_comment .content-list__item_comment
.content-list__item_comment .content-list__item_comment
.content-list__item_comment
{
    border-left: none;
    /* Далее убираем. */;
}

.megapost-cover__img, .megapost-cover__img_darken, .megapost-cover__inner {
    background:none !important;
    background-color:white !important;
}

.megapost-cover__inner, .megapost-cover_short, .megapost-cover__img  {
    height:auto !important;
}

.preview-data__title-link, .megapost-cover_light .list__item, .megapost-cover_light .list__item-link,
.megapost-cover_light .preview-data__blog-link, .megapost-cover_light .preview-data__time-published {
    color: black !important;
}
`;

