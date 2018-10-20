
function removeA(arr) {
    var what, a = arguments, L = a.length, ax;
    while (L > 1 && arr.length) {
        what = a[--L];
        while ((ax= arr.indexOf(what)) !== -1) {
            arr.splice(ax, 1);
        }
    }
    return arr;
}

let user_html_result;
function user_html(user,no_name) {
	user_html_result = true;
	if (!user) return (user_html_result = false);
	let html = ' | ';
	if (!no_name) {
		if (user.name == user.nickname || !user.name) html += '@'+user.nickname;
		else html += user.name+' @'+user.nickname;
	}
	//stats & questions
	if (user.solutions !== undefined) {
		let cnt_q_color = user.cnt_q < 4 ? 'red' : '#2d72d9';
		html += ' &nbsp;<a href="https://toster.ru/user/'+user.nickname+'/questions" title="Вопросов: '+user.cnt_q+'" style="font-size:13px;font-weight:normal"><font color='+cnt_q_color+'>'+user.cnt_q
			+'</font></a> &nbsp;<a href="https://toster.ru/user/'+user.nickname+'/answers" title="Ответов: '+user.cnt_a+'" style="font-size:13px;font-weight:normal">'+user.cnt_a+'</a>'
			+' &nbsp;<font color=#65c178 title="Решений: '+user.cnt_s+'%">'+user.cnt_s+'%</font>'
			+' &nbsp;<a href="https://toster.ru/user/'+user.nickname+'/questions" title="Отметил решениями: '+user.solutions+'%" style="font-size:13px"><b><font color=#000>'+user.solutions+'%</font></b></a>';
	} else user_html_result = false;
	//karma
	if (user.karma !== undefined) {
		if (!isNaN(parseFloat(user.karma)))
			html += ' &nbsp;<font color=#999>Карма:</font> <a href="https://habr.com/users/'+user.nickname+'/comments/" target=_blank style="font-size:13px"><b>' + (user.karma < 0 ? '<font color=red>' : '<font color=#6c8d00>+') + user.karma + '</font></b></a>';
		else
			html += ' &nbsp;<font color=#999>Карма:</font> ' + user.karma;
	} else user_html_result = false;
	html = '<span style="font-weight: normal">'+html+'</span>';
	if (user.solutions_pending || user.karma_pending) user_html_result = false;
	return html;
}

let qdb = {} // q_id => user
let elem = []; // {e:elem, id:q_id}
let request_questions = []; // [q_id, q_id, ... ]

function update_questions(on_success, on_fail) {
	chrome.runtime.sendMessage({
		type: "getQuestions",
		arr: request_questions,
	}, function(data) {
		//console.log("getQuestions",data);
		for(let q_id in data) {
			qdb[q_id] = data[q_id]; //copy (update missing elements)
		}
		let result = true;
		elem.forEach((q)=>{
			let user = qdb[q.id];
			let html = user_html(user);
			if (html) q.e.innerHTML = html;
			if (user_html_result) {
				removeA(request_questions, q.id);
				//removeA(elem, q);
			}
			else result = false;
		});
		//console.log(result);
		if (on_success && result) on_success();
		else if (on_fail && !result) on_fail();
	});
}

//all questions
function parse_questions() {
	let q = document.getElementsByClassName('question__complexity');
	for(let i=0;i<q.length;i++) {
		q[i].innerHTML = '...';
		let a = q[i].parentNode.parentNode.querySelector('h2 > a');
		let result = /\d+/.exec(a.href);
		if (result) {
			elem.push({e:q[i], id:result});
			request_questions.push(result);
		}
	}
	update_questions(null,()=> {
		let timer_index = setInterval(()=>{
			update_questions(()=>{ clearInterval(timer_index); });
		},500);
		setTimeout(()=>{
			clearInterval(timer_index);
		},17000);
	});
}

let udb = {}; // nickname => user
let elem_user = []; // {e:elem, nickname:nickname}
let request_user = {}; // nickname => true

function update_q(on_success, on_fail) {
	chrome.runtime.sendMessage({
		type: "getUsers",
		arr: request_user,
	}, function(data) {
		//console.log("getUsers",data);
		for(let nickname in data) {
			udb[nickname] = data[nickname]; //copy (update missing elements)
		}
		let result = true;
		elem_user.forEach((x)=>{
			let user = udb[x.nickname];
			let html = user_html(user,true);
			if (user_html_result) {
				if (html && !x.done) {
					x.e.innerHTML += html;
					x.done = true;
				}
				//removeA(request_questions, q.id);
				delete request_user[x.nickname];
				//removeA(elem_user, x);
			}
			else result = false;
		});
		//console.log(result);
		//console.log(elem_user);
		if (on_success && result) on_success();
		else if (on_fail && !result) on_fail();
	});
}

//page of the question
function parse_q() {
	let q = document.getElementsByClassName('user-summary__nickname');
	for(let i=0;i<q.length;i++) {
		let a = q[i].innerHTML.match(/<meta itemprop="alternateName" content="(.+)">/);
		if (a) {
			let nickname = a[1];
			elem_user.push({
				e:q[i],
				nickname:nickname,
			});
			request_user[nickname] = i==0 ? 1 : true;
		}
	}
	//console.log(elem_user);
	update_q(null,()=> {
		let timer_index = setInterval(()=>{
			//console.log('timer');
			update_q(()=>{ clearInterval(timer_index); });
		},500);
		setTimeout(()=>{
			clearInterval(timer_index);
		},17000);
	});
}


document.addEventListener('DOMContentLoaded', function () {
	if (location.href.indexOf('https://toster.ru/q/') > -1) {
		parse_q();
	}
	else if (!location.href.match(/^https:\/\/toster\.ru\/user\/.*\/questions/)) parse_questions();
});


