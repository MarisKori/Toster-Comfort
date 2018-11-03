
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
			let r = /<span itemprop="answerCount">\D*(\d+)\D*<\/span>/g;
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
		console.log("index_tags",index_tags);
		if (index_tags > -1) {
			let tags = db.question[question_id].tags = {};
			let index_tags2 = text.indexOf('</ul>', index_tags);
			console.log("index_tags2",index_tags2);
			let txt = text.substr(index_tags, index_tags2 - index_tags);
			console.log("txt",txt);
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

try {
	db = JSON.parse(localStorage.db);
} catch(e) {
	//
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
					a[q_id] = {q:question, u:user};
					updateUser(user_id);
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
	}
});

let TOSTER_OPTIONS = [
	'swap_buttons', 'hide_sol_button', 'show_habr', 'hide_word_karma',
	'show_name', 'show_nickname', 'hide_offered_services', 'use_ctrl_enter',
	'top24_show_tags', 'top24_show_author',
];

if (localStorage.top24_show_author === undefined) {
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



