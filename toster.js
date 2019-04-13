
//remove elements from array by value
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
		if (OPTIONS.show_name == 1 && OPTIONS.show_nickname == 1) {
			if (user.name == user.nickname || !user.name) html += '@'+user.nickname;
			else html += user.name+' @'+user.nickname;
		} else if (OPTIONS.show_nickname == 1) {
			html += '@'+user.nickname;
		} else if (OPTIONS.show_name == 1 && user.name) { // strange option, but ok
			html += user.name;
		}
	}
	//stats & questions
	if (user.solutions !== undefined) {
		let cnt_q_color = user.cnt_q < 4 ? 'red' : '#2d72d9';
		html += ' &nbsp;<a href="https://toster.ru/user/'+user.nickname+'/questions" title="Вопросов: '+user.cnt_q+'" style="font-size:13px;font-weight:normal"><font color='+cnt_q_color+'>'+user.cnt_q
			+'</font></a> &nbsp;<a href="https://toster.ru/user/'+user.nickname+'/answers" title="Ответов: '+user.cnt_a+'" style="font-size:13px;font-weight:normal">'+user.cnt_a+'</a>'
			+' &nbsp;<font color=#65c178 style="font-size:13px;" title="Решений: '+user.cnt_s+'%">'+user.cnt_s+'%</font>'
			+' &nbsp;<a href="https://toster.ru/user/'+user.nickname+'/questions" title="Отметил решениями: '+user.solutions+'%" style="font-size:13px"><b><font color=#000>'+user.solutions+'%</font></b></a>';
	} else user_html_result = false;
	//karma
	if (user.karma !== undefined) {
		let karma_word = OPTIONS.hide_word_karma == 1 ? '' : '<font color=#999>Карма:</font> ';
		if (!isNaN(parseFloat(user.karma)))
			html += ' &nbsp;'+karma_word+'<a href="https://habr.com/users/'
				+user.nickname+'/comments/" target=_blank style="font-size:13px" title="Карма пользователя на Хабре"><b>'
				+ (user.karma < 0 ? '<font color=red>' : '<font color=#6c8d00>+')
				+ user.karma + '</font></b></a>';
		else
			html += ' &nbsp;'+karma_word
				+ '<span style="font-size:13px;color:#898D92" title="Статус пользователя на Хабре">'
				+ user.karma + '</span>';
		if (user.stat_pub || user.stat_comment) {
			html += '<span title="Публикаций/комментариев на Хабре" class="show_habr" style="font-size:13px;color:#898D92;'
				+ (OPTIONS.show_habr == 1?'':'display:none')+'"> '
				+ (user.stat_pub || '0') + '/' + (user.stat_comment || '0');
		}
	} else user_html_result = false;
	html = '<span style="font-weight: normal">'+html+'</span>';
	if (user.solutions_pending || user.karma_pending) user_html_result = false;
	return html;
}

let qdb = {} // q_id => user
let elem = []; // {e:elem, id:q_id}
let request_questions = []; // [q_id, q_id, ... ]
let elem_top_24 = []; // {e:elem, }

function makeTags(tags) {
	let ul = document.createElement("UL");
	ul.className = 'tags-list';
	for(let id in tags) {
		let li = document.createElement("LI");
		li.className = 'tags-list__item';
		let a = document.createElement("A");
		a.href = 'https://toster.ru/tag/' + id;
		a.innerText = tags[id];
		li.appendChild(a);
		ul.appendChild(li);
	}
	return ul;
}

//Скрыть элемент, либо просто затемнить (на белом фоне)
function hideElementClever(el) {
	if (!OPTIONS.make_dark) {
		el.style.display = 'none';
		return;
	}
	let div = document.createElement('div');
	div.style.position = 'absolute';
	div.style.width = (el.clientWidth || 10) + 'px';
	div.style.height = (el.clientHeight || 10) + 'px';
	div.style.background = 'rgba(255,255,255,.7)';
	div.style.top = '0';
	div.style.pointerEvents = 'none';
	el.appendChild(div);
}

function update_questions(on_success, on_fail) {
	chrome.runtime.sendMessage({
		type: "getQuestions",
		arr: request_questions,
	}, function(data) {
		//console.log("getQuestions",data);
		let cnt = 0;
		for(let q_id in data) {
			qdb[q_id] = data[q_id]; //copy (update missing elements)
			cnt++;
		}
		//console.log('Update Question List:',cnt);
		let success = true;
		elem.forEach(q=>{
			if (q.tc_done) return;
			if (OPTIONS.hide_solutions && q.solution === undefined) {
				const found = q.e.parentNode.parentNode.parentNode.parentNode.querySelector('svg.icon_check');
				q.solution = !!found;
				if (found) {
					q.tc_done = true;
					let parent = q.e.parentNode.parentNode.parentNode.parentNode.parentNode;
					hideElementClever(parent)
					return;
				}
			}
			const rec = qdb[q.id];
			if (!rec) return (success = false);
			if (rec.hide) {
				q.tc_done = true;
				let parent = q.e.parentNode.parentNode.parentNode.parentNode.parentNode;
				hideElementClever(parent);
				return;
			}
			let user = rec.u;
			let html = user_html(user);
			if (html) q.e.innerHTML = html;
			if (user_html_result) {
				removeA(request_questions, q.id);
				q.tc_done = true;
				//removeA(elem, q);
			}
			else success = false;
			//Change color
			if (rec.color) {
				let parent = q.e.parentNode.parentNode.parentNode.parentNode.parentNode;
				parent.style.backgroundColor = rec.color;
			}
		});
		elem_top_24.forEach(t=>{
			if (t.tc_done == 2) return;
			const rec = qdb[t.id];
			if (!rec) return (success = false);
			if (rec.hide) {
				t.tc_done = 2;
				t.e.style.display = 'none';
				return;
			}
			if (!t.tc_done) {
				if (OPTIONS.top24_show_tags) {
					const tags = rec.q.tags;
					if (tags) {
						t.e.insertBefore(makeTags(tags), t.a);
						t.e.insertBefore( document.createElement("BR"), t.a);
					}
				}
				t.tc_done = 1;
			}
			if (t.tc_done == 1) {
				if (!OPTIONS.top24_show_author) {
					t.tc_done = 2;
					return;
				}
				const user = rec.u;
				if (user) {
					let html = user_html(user,true);
					if (html) {
						if (!t.author) {
							let newItem = t.author = document.createElement("NOBR");
							newItem.innerHTML = html;
							t.e.insertBefore( newItem, t.a);
							t.e.insertBefore( document.createElement("BR"), t.a);
						} else {
							t.author.innerHTML = html;
						}
					}
					if (user_html_result) {
						removeA(request_questions, t.id);
						t.tc_done = 2;
						return;
					}
				}
			}
			success = false;
		});
		if (on_success && success) on_success();
		else if (on_fail && !success) on_fail();
	});
}

//all questions
function parse_questions() {
	let q;
	if (!is_current_question) {
		q = document.getElementsByClassName('question__complexity');
		for(let i=0;i<q.length;i++) {
			q[i].innerHTML = '...';
			let a = q[i].parentNode.parentNode.querySelector('h2 > a');
			let result = /\d+/.exec(a.href);
			if (result) {
				elem.push({e:q[i], id:result[0]});
				request_questions.push(result[0]);
			}
		}
	}
	if (OPTIONS.top24_show_tags || OPTIONS.top24_show_author) {
		q = document.querySelectorAll('dl[role="most_interest"] > dd > ul.content-list > li.content-list__item');
		for(let i=0;i<q.length;i++) {
			let a = q[i].querySelector('a');
			if(!a)continue;
			let result = /\d+/.exec(a.href);
			if (result) {
				elem_top_24.push({e:q[i], a:a, id:result[0]});
				request_questions.push(result[0]);
			}
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
		let cnt = 0;
		for(let nickname in data) {
			udb[nickname] = data[nickname]; //copy (update missing elements)
			cnt++;
		}
		//console.log('Update Question Records:',cnt);
		let result = true;
		elem_user.forEach(x=>{
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
let is_current_question;
function parse_q() {
	is_current_question = true;
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
			//Предполагаем, что первый в списке - автор вопроса.
			if (i == 0) {
				let qm = location.href.match(/toster\.ru\/q\/(\d+)/);
				let tags = document.querySelector('.tags-list');
				let q_title = document.querySelector('.question__title');
				chrome.runtime.sendMessage({
					type: 'directQuestionUpdate',
					nickname:nickname,
					q_id:qm && qm[1]-0,
					tags_html: tags && tags.outerHTML,
					title: q_title && q_title.innerHTML.trim(),
				});
			}
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

//Enable/disable Ctrl+Enter handler
function set_placeholder(text) {
	const textareas = document.querySelectorAll('textarea.textarea');
	for(let i=0; i<textareas.length; i++) {
		textareas[i].setAttribute('placeholder', text);
	}
}

function ctrl_enter_handler(event) {
	const target = event.target;
	if (target.classList.contains('textarea')) {
		const form = event.target.form;
		const button = form.querySelector('button[type="submit"]');
		if (button) {
			if ((event.ctrlKey || event.metaKey) && (event.keyCode === 13 || event.keyCode === 10)) {
				button.click();
			};
		}
	}
}

function set_ctrl_enter_handler() {
	document.addEventListener('keydown', ctrl_enter_handler);
	set_placeholder('Жми Ctrl+Enter для отправки формы');
}

//Enable save form toLocalStorage
function enable_save_form_to_storage() {
	const formsData = localStorage.getItem('formsData');
	if (!formsData) {
		localStorage.setItem('formsData', '{}');
	}
	const answer_form = document.querySelector('#answer_form');
	if (answer_form) {
		const textarea = answer_form.querySelector('textarea.textarea');
		const questionId = location.pathname.split('/').pop();
		restore_form_from_storage(questionId);
		answer_form.addEventListener('submit', remove_form_from_storage(questionId));
		textarea.addEventListener('input', save_form_to_storage(questionId));
	}
}

function save_form_to_storage(questionId) {
	return (event) => {
		const value = event.target.value;
		const formsData = JSON.parse(localStorage.getItem('formsData'));
		if (value) {
			formsData[questionId] = value;
		} else {
			delete formsData[questionId];
		}
		localStorage.setItem('formsData', JSON.stringify(formsData));
	}
}

function restore_form_from_storage(questionId) {
	const formsData = JSON.parse(localStorage.getItem('formsData'));
	if (formsData[questionId]) {
		const answer_form = document.querySelector('#answer_form');
		answer_form.querySelector('textarea.textarea').value = formsData[questionId];
	}
}

function remove_form_from_storage(questionId) {
	return (event) => {
		const formsData = JSON.parse(localStorage.getItem('formsData'));
		delete formsData[questionId];
		localStorage.setItem('formsData', JSON.stringify(formsData));
	}
}

let is_options_loaded = false;
let arr_on_options_callback = [];
function listenOnOptions(fn) {
	if (is_options_loaded) fn();
	else arr_on_options_callback.push(fn);
}

function updateNotifications() {
	try {
		if (OPTIONS.notify_if_inactive&&
			(document.hidden===true
				||document.webkitHidden===true
				||document.visibilityState=='visible'
				||document.visibilityState=='prerender'
			)
		) {
			chrome.runtime.sendMessage({type:'tabIsActive'});
			return;
		}
		chrome.runtime.sendMessage({
			type: "getNotifications",
		}, function(arr) {
			for (q_id in arr) {
				let item = arr[q_id];
				let n = new Notification(item.w, {body: item.title, tag:item.title,
					icon:'https://habrastorage.org/r/w120/files/c99/6d8/5e7/c996d85e75e64ff4b6624d2e3f694654.jpg'});
				n.onclick = function(){
					window.focus();
					n.close();
					window.location.href = "https://toster.ru/q/"+item.q_id+"?e="+item.e+"#"+item.anchor;
				}
			}
		});
	} catch(e) {
		console.log('Extension unloaded!');
		window.location.reload();
	}
}

//Добавить кнопку "Следить", чтобы получать быстрые уведомления
function addListenButton() {
	if (location.href.indexOf('https://toster.ru/q/') == -1) return;
	let m = location.href.match(/^https:\/\/toster\.ru\/q\/(\d+)/);
	if (!m) return;
	let qnum = m[1]-0;
	let tags = document.querySelector('.question__tags');
	if (!tags) return;
	chrome.runtime.sendMessage({
		type: "getSubStatus",
		qnum: qnum,
	}, function(status) {
		const DISABLED = 'btn btn_subscribe';
		const ENABLED = 'btn btn_subscribe btn_active';
		let div = document.createElement('DIV');
		div.style.position = 'absolute';
		div.style.right = "30px";
		let a = document.createElement('A');
		a.className = status ? ENABLED : DISABLED;
		a.innerHTML = status ? 'Отслеживается' : 'Следить';
		a.title = "Получать быстрые уведомления";
		div.appendChild(a);
		//div.innerHTML = '<a class="btn btn_subscribe btn_active" href="asd" title="Получать быстрые уведомления">Следить</a>';
		tags.appendChild(div);
		//tags.innerHTML += '<div style="background-color:red;top: 0;left:100px;width:200px">подписаться</div>';
		a.addEventListener('click',()=>{
			if (!status) {
				let subscribe_button = document.getElementById('question_interest_link_'+qnum);
				if (subscribe_button && subscribe_button.className == DISABLED) {
					subscribe_button.click();
				}
			}
			chrome.runtime.sendMessage({type: "setSubStatus", qnum:qnum}, function(new_status) {
				status = new_status;
				a.className = new_status ? ENABLED : DISABLED;
				a.innerHTML = new_status ? 'Отслеживается' : 'Следить';
			});
		});
	});
	
}


function initNotifications() {
	if (!window.Notification || !Notification.permission) return; //not supported
	if (Notification.permission == "denied") return;
	if (Notification.permission != "granted") {
		Notification.requestPermission(function (status) {
			if (status !== "granted") {
				chrome.runtime.sendMessage({type: "disableNotifications"});
				return;
			}
			setInterval(updateNotifications, 3000);
		});
		return;
	}
	setInterval(updateNotifications, 3000);
	updateNotifications();
	//add subscribe button
	addListenButton();
	//Пересчет уведомлений для иконки
	let ul = document.querySelector(".events-list_navbar");
	if (ul) {
		let counter = ul.querySelector(".events-list__item_more");
		let m, cnt;
		if (counter && (m = counter.innerHTML.match(/<span>(\d+)<\/span>/))) {
			cnt = m[1] - 0;
		} else {
			let lis = ul.querySelectorAll(".events-list__item");
			cnt = lis.length;
		}
		chrome.runtime.sendMessage({type: "updateIconNum", cnt:cnt});
	}
}

let OPTIONS = {};
// Change page according to options
function parse_opt() {
	chrome.runtime.sendMessage({
		type: "getOptions",
	}, function(options) {
		OPTIONS = options;
		if (options.hide_sol_button == 1) {
			let q = document.getElementsByClassName('buttons-group_answer');
			for(let i=0;i<q.length;i++) {
				let sol = q[i].querySelector('span.btn_solution');
				if (sol) sol.style.display = 'none';
			}
		} else if (options.swap_buttons == 1) {
			let q = document.getElementsByClassName('buttons-group_answer');
			for(let i=0;i<q.length;i++) {
				let sol = q[i].querySelector('span.btn_solution');
				let like = q[i].querySelector('a.btn_like');
				if (sol && like) {
					q[i].insertBefore(like, sol);
				}
			}
		}
		if (options.show_habr == 1) {
			let q = document.getElementsByClassName('buttons-group_answer');
			for(let i=0;i<q.length;i++) {
				q[i].style.display = '';
			}
		}
		if (options.hide_offered_services == 1) {
			let q = document.getElementsByClassName('offered-services');
			for (let i=0;i<q.length;i++) {
				q[i].style.display = 'none';
			}
		}
		if (options.use_ctrl_enter == 1) {
			set_ctrl_enter_handler();
		}
		if (options.save_form_to_storage == 1) {
			enable_save_form_to_storage();
		}
		arr_on_options_callback.forEach(fn=>fn());
		is_options_loaded = true;
		//Manage notifications
		if (options.enable_notifications == 1) initNotifications();
		if (options.datetime_replace == 1) {
			let now = (new Date()).getTime();
			let t = document.getElementsByTagName('time');
			for(let i=0;i<t.length;i++) {
				let title = t[i].title;
				let datetime = t[i].dateTime;
				if (datetime && now - (new Date(datetime)).getTime() > options.datetime_days * 24 * 60 * 60000) {
					if (title && title.indexOf('Дата публикации: ') > -1) t[i].innerHTML = title.substr(17);
				}
			}
		}
	});
}


document.addEventListener('DOMContentLoaded', function () {
	parse_opt();
	if (location.href.indexOf('https://toster.ru/q/') > -1 || location.href.indexOf('https://toster.ru/answer') > -1) {
		parse_q();
	}
	if (!location.href.match(/^https:\/\/toster\.ru\/user\/.*\/questions/)) listenOnOptions(parse_questions);
});


