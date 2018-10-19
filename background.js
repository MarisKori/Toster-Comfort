
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

let saveDB_timer;
function saveDB() {
	if (saveDB_timer !== undefined) clearTimeout(saveDB_timer);
	saveDB_timer = setTimeout(()=>{
		try {
			for(let id in db.user) {
				delete db.user[id].solutions_pending;
				delete db.user[id].karma_pending;
			}
			localStorage.db = JSON.stringify(db);
		} catch(e) {
			//clean
			//localStorage.db = '{"user":{},"question":{}}';
			let now = (new Date()).getTime();
			db.question = {};
			for(let id in db.user) {
				let user = db.user[id];
				if (!(now - user.update_time < 7*24*60*60*1000)) delete db.user[id]; //7 days
			}
			try {
				localStorage.db = JSON.stringify(db);
			} catch(e2) {}
		}
	},15000);
}


//
function updateUser(nickname) {
	if (!nickname) return console.log('No nickname!'); //impossible
	let user = db.user[nickname];
	if (!user) user = db.user[nickname] = {}; //impossible
	user.nickname = nickname;
	let now = (new Date()).getTime();
	let need_update = false;
	if (!(now - user.update_time < 24*60*60*1000)) {
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
	//karma
	if (need_update || user.karma === undefined && !user.karma_pending) {
		user.karma_pending = true;
		saveDB();
		getURL('https://habr.com/users/'+nickname+'/',(text)=>{
			delete user.karma_pending;
			let a = /<div class="stacked-counter__value[^>]*>(.*)<\/div>\s*<div class="stacked-counter__label">Карма<\/div>/.exec(text);
			if (a) {
				user.karma = a[1].replace(',','.').replace('–','-');
				let karma = parseFloat(a[1]);
				if (!isNaN(karma)) { // !!!
					user.karma = karma;
				}
			} else {
				user.karma = "read-only";
				console.log('Karma not found, user:',nickname);
			}
		}, ()=>{ delete user.karma_pending; user.karma = 'не зарегистр.'; });
	}
}

function analyzeQuestion(question_id) {
	db.question[question_id] = {is_pending:true};
	saveDB();
	getURL('https://toster.ru/q/' + question_id, function(text) {
		let index_name = text.indexOf('<meta itemprop="name" content="');
		if (index_name > -1) {
			let index_name2 = text.indexOf('</span>', index_name);
			let txt = text.substr(index_name, index_name2 - index_name);
			let user_name = txt.match(/<meta itemprop=\"name\" content=\"([^"]*)\">/)[1];
			//console.log('user_name',user_name);
			let user_nickname = txt.match(/<meta itemprop=\"alternateName\" content=\"([^"]*)\">/)[1];
			console.log('user_nickname',user_nickname);
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
	});
}

let db;
function reset_db() {
	db = {
		user:{}, // user_id => { name: name, nickname: nickname, ... }
		question:{}, // q_id => { is_pending:bool, user_id:string }
	};
}
reset_db();

try {
	db = JSON.parse(localStorage.db);
} catch(e) {
	//
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.type == "getQuestions") {
		let a = {};
		request.arr.forEach((v)=>{
			let question = db.question[v];
			if (question) {
				let user_id = question.user_id;
				let user = user_id && db.user[user_id];
				if (user) {
					a[v] = user;
					updateUser(user_id);
				}
				else if (!question.is_pending) analyzeQuestion(v);
			}
			else analyzeQuestion(v);
		});
		sendResponse(a);
    } else if (request.type == "getUsers") {
		let u = {};
		for(let nickname in request.arr) {
			let user = db.user[nickname];
			if (user) {
				u[nickname] = user;
			}
			updateUser(nickname);
		}
		sendResponse(u);
	}
});
















