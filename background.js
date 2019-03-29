
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

function analyzeQuestion(question_id, now) {
	db.question[question_id] = {is_pending:true, ut:now};
	saveDB();
	getURL('https://toster.ru/q/' + question_id, function(text) {
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
				db.question[question_id].is_pending = false;
				db.question[question_id].user_id = user_nickname;
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
			let tags = db.question[question_id].tags = {};
			let index_tags2 = text.indexOf('</ul>', index_tags);
			let txt = text.substr(index_tags, index_tags2 - index_tags);
			let r = /<a href="https?:\/\/toster\.ru\/tag\/([^">]*)">\s*([\S ]+?)\s*<\/a>/g
			let a = r.exec(txt);
			while (a) {
				tags[a[1]] = a[2];
				a = r.exec(txt);
			}
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

//Prepare environment and call eval()
function checkCondition(cond, current_data) {
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
	let env = {
		questions: current_data.u.cnt_q || 999,
		answers: current_data.u.cnt_a || 999,
		solutions: current_data.u.solutions || 100,
		karma: current_data.u.karma || 0,
		comments: current_data.u.stat_comment || 0,
		articles: current_data.u.stat_pub || 0,
	}
	env.q = env.questions;
	env.a = env.answers;
	env.s = env.solutions;
	env.k = env.karma;
	env.c = env.comments;
	env.publications = env.articles;
	env.p = env.publications;
	try {
		return eval.lite(cond, env);
	} catch(e) {
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
		sendResponse(options);
	}
});

let TOSTER_OPTIONS = [
	'swap_buttons', 'hide_sol_button', 'show_habr', 'hide_word_karma',
	'show_name', 'show_nickname', 'hide_offered_services', 'use_ctrl_enter',
	'top24_show_tags', 'top24_show_author', 'hide_solutions', 'save_form_to_storage',
	'make_dark',
];

let HABR_OPTIONS = [
	'move_posttime_down','move_stats_up', 'hide_comment_form_by_default',
];

if (localStorage.hide_comment_form_by_default === undefined) { //last added option
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
	//Habr options
	if (localStorage.move_posttime_down === undefined) localStorage.move_posttime_down=0;
	if (localStorage.move_stats_up === undefined) localStorage.move_stats_up=0;
	if (localStorage.hide_comment_form_by_default === undefined) localStorage.hide_comment_form_by_default=0;
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

let db_conditions = [];
function update_conditions() {
	db_conditions = [];
	const lines = localStorage.all_conditions.split("\n");
	for(let i=0;i<lines.length;i++) {
		let rule = lines[i].trim(); //Строка, содержащая отдельное правило
		if (rule.indexOf('//') !== -1) rule = rule.split('//')[0].trim();
		if (!rule) continue;
		let eq_idx = rule.lastIndexOf('='); //Последний знак "="
		if (eq_idx < 1 || rule[eq_idx-1] == '=') continue;
		let rule_cond_str = rule.substring(0,eq_idx).trim(); //Условие правила - eval(rule_cond_str)
		let rule_action_str = rule.substring(eq_idx+1).trim(); //Действие правила - #ff0 или hide
		db_conditions.push({
			cond: rule_cond_str,
			act: rule_action_str,
		});
	}
}
if (localStorage.all_conditions) update_conditions();




