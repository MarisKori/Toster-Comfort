let savetime1 = performance.now(),log=console.log;
let checkPoint = s=>{return;let t=performance.now(); log(s,t-savetime1); savetime1=t};
let d=document,URL,Q,did=e=>d.getElementById(e),manifest=chrome.runtime.getManifest(),owner,mainmenu={},g_status,
	ext_url=chrome.runtime.getURL('');
let sel = cl=>d.querySelector(cl);
let c = (tag,val,cl) => {
	let e = d.createElement(tag);
	if(val)e.innerText = val;
	if(cl){
		if (typeof cl=='string')e.className=cl;
		else for (let k in cl) e.setAttribute(k,cl[k]);
	}
	return e;
};
Element.prototype.a=function(tag,val,cl){
	if (typeof tag != 'string') {
		for(let i=0;i<arguments.length;i++) this.appendChild(arguments[i]);
		return this;
	}
	let n = c(tag,val,cl);
	this.appendChild(n);
	return n;
}
function clearString(s) {
	return s.length < 12 ? s : (' ' + s).slice(1);
}

//Простейшая система событий
let TheWorld = {
	listeners:{},
	AddEvent:function(name,fn) {
		if (!this.listeners[name]) {
			this.listeners[name] = [];
		}
		this.listeners[name].push(fn);
	},
	PushEvent:function(name) {
		this.listeners[name].forEach(fn=>fn());
	},
}

//FireFox check is page is loaded
const fixFirefox = !did('toster-comfort-sign');

//remove elements from array of objects by id
function removeA(arr,id) {
	for(let i=arr.length-1;i>=0;i--){
		if (arr[i].id == id) {
			arr.splice(i, 1);
		}
	}
		return arr;
}

let NOW_DATE;
function getDateStr(tm) {
	if (!NOW_DATE) NOW_DATE = Math.round((new Date()).getTime() / 1000);
	let days = Math.floor((NOW_DATE - tm) / (60 * 60 * 24));
	let n = days;
	if (n == 0 || n == -1) n = 1;
	let str;
	if (n < 365) {
		let arr_days = ['день', 'дня', 'дней'];
		let num = (n%10==1 && n%100!=11 && 1 ||(n%10>=2 && n%10<=4 &&(n%100<10 || n%100>=20)&& 2 || 3))-1;
		str = n + ' ' + arr_days[num];
	} else {
		n = Math.floor((n / 365) * 10) * 0.1;
		if (n === Math.floor(n)) {
			let arr_years = ['год', 'года', 'лет'];
			let num = (n%10==1 && n%100!=11 && 1 ||(n%10>=2 && n%10<=4 &&(n%100<10 || n%100>=20)&& 2 || 3))-1;
			str = n + ' ' + arr_years[num];
		} else str = n.toFixed(1) + ' лет';
	}
	getDateStr.days = days;
	return str;
}

//Подсчитывает т.н. пользу пользователя, на основе других цифр статистики
function countRespect(user) {
	let sol_con = user.cnt_a * user.cnt_s * 0.01;
	let respect = user.cnt_a && Math.round((user.con - sol_con) / user.cnt_a * 3.333333333 * 10) * 0.1 || 0;
	if (respect < 0) respect = 0;
	user.respect = respect - 0;
	return respect;
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
	if (OPTIONS.show_respect) countRespect(user);
	//stats & questions
	if (user.solutions !== undefined) {
		let cnt_q_color = user.cnt_q < 4 ? 'red' : '#2d72d9';
		let honor = user.con || 0;
		html += //https://qna.habr.com/user/dollar/tags
			(OPTIONS.show_honor && !OPTIONS.sol_honor_replace?' &nbsp;<a style="color:#a98ae7;font-size:13px;" title="Вклад: '
				+honor+'" href="https://qna.habr.com/user/'+user.nickname+'/tags"><b>'+honor+'</b></a>':'')
			+(!OPTIONS.show_cnt_questions?'':' &nbsp;<a href="https://qna.habr.com/user/'+user.nickname
				+'/questions" title="Вопросов: '+user.cnt_q+'" class="norma"><font color='+cnt_q_color+'>'+user.cnt_q
				+'</font></a>')
			+(!OPTIONS.show_cnt_answers?'':' &nbsp;<a href="https://qna.habr.com/user/'+user.nickname+'/answers" title="Ответов: '+user.cnt_a
				+'" class="norma">'+user.cnt_a+'</a>')
			+(OPTIONS.show_perc_solutions && !OPTIONS.sol_honor_replace?' &nbsp;<font color=#65c178 style="font-size:13px;" title="Решений: '
				+user.cnt_s+'%">'+user.cnt_s+'%</font>':'')
			+(OPTIONS.show_honor && OPTIONS.sol_honor_replace?' &nbsp;<a style="color:#a98ae7;font-size:13px;" title="Вклад: '
				+honor+'" href="https://qna.habr.com/user/'+user.nickname+'/tags"><b>'+honor+'</b></font>':'')
			+(!OPTIONS.show_perc_sol_marks?'':user.solutions==-1?'':' &nbsp;<a href="https://qna.habr.com/user/'+user.nickname+'/questions" title="Отметил решениями: '
				+user.solutions+'%" style="font-size:13px"><b><font color=#000>'+user.solutions+'%</font></b></a>')
			+(OPTIONS.show_respect && user.respect?' &nbsp;<a href="https://qna.habr.com/user/'+user.nickname
				+'" title="Лайков на ответ: '+(user.respect).toFixed(1)
				+'" class="norma" style="color:#ff9040">'+(user.respect).toFixed(1)+'</a>':'');
	} else user_html_result = false;
	//karma
	if (user.karma !== undefined) {
		let karma_word = OPTIONS.hide_word_karma == 1 ? '' : '<font color=#999>Карма:</font> ';
		if (!isNaN(parseFloat(user.karma)))
			html += ' &nbsp;'+karma_word+'<a href="https://habr.com/users/'
				+user.nickname+'/comments/" target=_blank style="font-size:13px" title="Карма пользователя на Хабре"><b>'
				+ (user.karma < 0 ? '<font color=red>' : '<font color=#6c8d00>+')
				+ user.karma + '</font></b></a>';
		else {
			let k = user.karma === 'r' ? 'read-only' : (user.karma === 'n' ? 'не зарегистр.' : user.karma);
			if (k === 'read-only')
				html += ' &nbsp;'+karma_word+'<a href="https://habr.com/users/'
					+user.nickname+'/" target=_blank style="font-size:13px;color:#898D92;font-weight:normal" title="Статус пользователя на Хабре">'
					+ k + '</font></a>';
			else
				html += ' &nbsp;'+karma_word
					+ '<span style="font-size:13px;color:#898D92" title="Статус пользователя на Хабре">'
					+ k + '</span>';
		}
		if (user.stat_pub || user.stat_comment) {
			html += '<span title="Публикаций/комментариев на Хабре" class="show_habr" style="font-size:13px;color:#898D92;'
				+ (OPTIONS.show_habr == 1?'':'display:none')+'"> '
				+ (user.stat_pub || '0') + '/' + (user.stat_comment || '0');
		}
		if (user.reg && OPTIONS.show_user_reg_date) { //reg date
			let str = getDateStr(user.reg);
			let days = getDateStr.days;
			html += ' &nbsp;'+'<a href="https://habr.com/users/'
				+user.nickname+'/" target=_blank style="font-size:13px" title="Зарегистрирован на Хабре"><span class="small" style="'
				+ (days < 10 ? 'color:red;font-weight:bold' :
					days < 30 ? 'color:red;font-weight:normal' :
					days < 90 ? 'color:#ff9040;font-weight:normal' :
					days >= 365*3 ? 'color:#090;font-weight:bold' :
					days >= 365 ? 'color:#090;font-weight:normal' : 'color:#555;font-weight:normal')
				+'">' + str
				+'</span></a>';
		}
	} else user_html_result = false;
	html = '<span style="font-weight: normal">'+html+'</span>';
	if (user.solutions_pending || user.karma_pending) user_html_result = false;
	return html;
}

//Сокращаем названия тегов
const SHORT_TAGS_TABLE = {
	['информационная безопасность']: 'ИБ',
	['регулярные выражения'] : 'Рег. выражения',
	['программирование']: 'Программ.',
	['компьютерные сети']: 'Сети',
	['google chrome']: 'Chrome',
	['операционные системы']: 'OS',
	['системное администрирование']: 'Сис. админство',
	['разработка игр']: 'Геймдев',
	['мобильная разработка']: 'Моб. разработка',
	['управление временем']: 'Упр. временем',
	['искусственный интеллект']: 'ИИ',
	['электронная коммерция']: 'Эл. коммерция',
	['mozilla firefox']: 'Firefox',
	['электронные книги']: 'Эл. книги',
	//['Юриспруденция в IT']: ?
	//['Обработка изображений']: 'Обработка изображений',
	['рынок доменных имен']: 'Рынок доменов',
	['системное программирование']: 'Сис. программ.',
	['восстановление данных']: 'Восст. данных',
	['дополненная реальность']: 'AR',
	['спутниковая навигация']: 'Спутн. навигация',
	['графические оболочки']: 'Граф. оболочки',
	['адаптивный дизайн']: 'Адапт. дизайн',
	['администрирование баз данных']: 'Админ. СУБД',
	['сетевое администрирование']: 'Сетев. админство',
	['поисковая оптимизация']: 'Поиск. оптимиз.',
	['функциональное программирование']: 'Функ. программ.',
	['интерфейс пользователя']: 'UI',
	['мобильные устройства']: 'Моб. устройства',
	['сетевое оборудование']: 'Сет. оборудование',
	['языки программирования']: 'ЯП',
	['unity game engine']: 'Unity',
	['интернет-реклама']: 'Реклама',
	['сетевое оборудование']: 'Сет. оборудование',
	['мобильная связь']: 'Моб. связь',
	['машинный перевод с одного языка на другой']: 'Машинный перевод',
	['уплата налогов с it-бизнеса']: 'Налоги',
	['юриспруденция в it']: 'Право',
	['visual studio code']: 'VS Code',
	['системы контроля версий']: 'VCS',
	['базы данных']: 'СУБД',
	['твердотельные накопители']: 'SSD',
}
function makeShortTags(tag) {
	return SHORT_TAGS_TABLE[tag.trim().toLowerCase()] || tag;
}


let qdb = {} // q_id => user
let elem = []; // {e:elem, id:q_id}
let request_questions = []; // [{id:123}, {id:234,v:5}, ... ]
let elem_top_24 = []; // {e:elem, }

function makeTags(tags) {
	let ul = c("UL");
	ul.className = 'tags-list';
	for(let id in tags) {
		let li = c("LI");
		li.className = 'tags-list__item';
		let a = c("A",makeShortTags(tags[id]));
		a.href = 'https://qna.habr.com/tag/' + id;
		ul.a(li.a(a));
	}
	return ul;
}

//Скрыть элемент, либо просто затемнить (на белом фоне)
/* old function that doesn't work anymore
function hideElementClever(el) {
	if (!OPTIONS.make_dark) {
		el.style.display = 'none';
		return;
	}
	let div = c('div');
	div.style.position = 'absolute';
	div.style.width = (el.clientWidth || 10) + 'px';
	div.style.height = (el.clientHeight || 10) + 'px';
	div.style.background = 'rgba(255,255,255,.7)';
	div.style.top = '0';
	div.style.pointerEvents = 'none';
	el.a(div);
} */

function hideElementClever(target) {
  const relativeParent = target.offsetParent;
  const hider = document.createElement('div');
  hider.style.position = 'absolute';
  hider.style.width = target.offsetWidth + 'px';
  hider.style.height = target.offsetHeight + 'px';
  hider.style.background = 'rgba(255,255,255,.7)';
  hider.style.top = target.offsetTop + 'px';
  hider.style.left = target.offsetLeft +'px';
  hider.style.pointerEvents = 'none';
  relativeParent.appendChild(hider);
}

function update_questions(on_success, on_fail) {
	try {
		chrome.runtime.sendMessage({
			type: "getQuestions",
			arr: request_questions,
		}, function(data) {
			//log("getQuestions",data);
			let cnt = 0;
			for(let q_id in data) {
				qdb[q_id] = data[q_id]; //copy (update missing elements)
				cnt++;
			}
			//log('Update Question List:',cnt);
			let success = true;
			elem.forEach(q=>{
				if (q.tc_done) return;
				if (OPTIONS.hide_solutions && q.solution === undefined) {
					const found = q.e.parentNode.parentNode.parentNode.parentNode.querySelector('svg.icon_check');
					q.solution = !!found;
					if (found) {
						q.tc_done = true;
						let parent = q.e.parentNode.parentNode.parentNode.parentNode.parentNode;
						parent.style.paddingLeft = "30px";
						parent.style.paddingRight = "30px";
						parent.style.margin = "0 -30px";
						hideElementClever(parent)
						//return;
					}
				}
				const rec = qdb[q.id];
				if (!rec) {
					if (!q.tc_done) success = false;
					return;
				}
				//Change color
				if (rec.color) {
					let parent = q.e.parentNode.parentNode.parentNode.parentNode.parentNode;
					parent.style.backgroundColor = rec.color;
					//Patch from d0kur0. Фиксит отступы текста от края подсветки
					parent.style.paddingLeft = "30px";
					parent.style.paddingRight = "30px";
					parent.style.margin = "0 -30px";
				}
				if (rec.hide && !q.tc_done) {
					q.tc_done = true;
					let parent = q.e.parentNode.parentNode.parentNode.parentNode.parentNode;
					hideElementClever(parent);
					//return;
				}
				let user = rec.u;
				let html = user_html(user);
				if (html) {
					q.e.innerHTML = html;
				}
				if (user_html_result) {
					if (OPTIONS.show_blue_circle && (rec.q.sub || rec.q.sb)) { //html+='<span class="dot"></span>';
						let q_wrap = q.e.parentNode.parentNode;
						if (q_wrap) {
							let q_title = q_wrap.querySelector('.question__title');
							if (q_title) {
								let dot = q_title.querySelector('.dot_sub') || q_title.querySelector('.dot_sb');
								if (!dot) {
									if (rec.q.sub) q_title.a('span',null,'dot_sub');
									else q_title.a('span',null,'dot_sb');
								}
							}
						}
					}
					removeA(request_questions, q.id);
					q.tc_done = true;
				}
				else if (!q.tc_done) success = false;
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
							t.e.insertBefore( c("BR"), t.a);
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
								let newItem = t.author = c("NOBR");
								newItem.innerHTML = html;
								t.e.insertBefore( newItem, t.a);
								t.e.insertBefore( c("BR"), t.a);
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
	} catch(e) {
		log('Ошибка доступа к расширению TC.');
	}
}

//all questions
let found_first_q_id=0;
let top24_done;
function parse_questions() {
	request_questions = [];
	elem=[];
	let q,first;
	if (1) {
		//content-list__item - li
		//question question_short - такое
		//question__content
		//question__content_fluid
		//question__tags
		q = d.getElementsByClassName('question__tags');
		for(let i=0;i<q.length;i++) {
			let complexity = q[i].querySelector('.question__complexity');
			if (!complexity) q[i].a(complexity = c('span',null,'question__complexity'));
			complexity.innerText = '...';
			let container = complexity.parentNode.parentNode;
			let a = container.querySelector('h2 > a');
			let views_boxes = container.querySelectorAll('.question__views-count');
			let views_box = views_boxes[views_boxes.length-1];
			let m = views_box && views_box.innerHTML.match(/(\d+)\s*просмот/);
			let views = m && m[1] || '0';
			let result = /\d+/.exec(a.href);
			if (result) {
				let q_id = result[0];
				if(!first){
					found_first_q_id=q_id-0;
					first=true;
				}
				elem.push({e:complexity, id:q_id, v:views});
				request_questions.push({id:q_id,v:views});
			}
		}
	}
	if(!top24_done){
		top24_done=true;
		elem_top_24=[];
		if ((OPTIONS.top24_show_tags || OPTIONS.top24_show_author) && !OPTIONS.aside_right_hide && OPTIONS.top24_show) {
			q = d.querySelectorAll('dl[role="most_interest"] > dd > ul.content-list > li.content-list__item');
			for(let i=0;i<q.length;i++) {
				let a = q[i].querySelector('a');
				if(!a)continue;
				let result = /\d+/.exec(a.href);
				if (result) {
					elem_top_24.push({e:q[i], a:a, id:result[0]});
					request_questions.push({id:result[0]});
				}
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
let elem_user = []; // {e:elem, nickname:nickname} // .e property is an element with class 'user-summary__nickname'
let request_user = {}; // nickname => true

function update_q(on_success, on_fail) {
	chrome.runtime.sendMessage({
		type: "getUsers",
		arr: request_user,
	}, function(data) {
		//log("getUsers",data);
		//let cnt = 0;
		for(let nickname in data) {
			udb[nickname] = data[nickname]; //copy (update missing elements)
			//cnt++;
		}
		//log('Update Question Records:',cnt);
		let result = true;
		let users_with_info = {}; //local cache
		let answer_author = '';
		elem_user.forEach(x=>{
			if (x.done) return;
			let user = udb[x.nickname];
			if (!user) {
				result = false;
				return;
			}
			if (user.ban) { //Это сразу конец работы с данным пользователем. Вычеркиваем
				let e = x.e;
				while (e=e.parentNode) {
					if (e.tagName == 'LI') {
						let comment = e.querySelector('.comment');
						if (comment) {
							comment.style.display = 'none';
							e.a('i',!OPTIONS.show_ban_info?'Комментарий скрыт.':'Комментарий пользователя @'+x.nickname+' скрыт.');
						} // else e.style.display = 'none';
					} else if (!e.classList) {
						log('ERROR! tag = ',e.tagName,e);
						break;
					} else if (e.classList.contains('content-list__item')) {
						let wrapper = e.querySelector('.answer_wrapper');
						if (wrapper) {
							if (e.parentNode.parentNode.id == 'solutions') {
								if (OPTIONS.dont_ban_solutions) break; //отменяем бан
								e.a('i',!OPTIONS.show_ban_info?'Решение скрыто.':'Решение пользователя @'+x.nickname+' скрыто.');
							} else {
								e.a('i',!OPTIONS.show_ban_info?'Ответ скрыт.':'Ответ пользователя @'+x.nickname+' скрыт.');
							}
							wrapper.style.display = 'none';
						} // else e.style.display = 'none';
					} else if (e.classList.contains('question-head')) { //вопрос
						break; //не баним
					} else continue;
					//e.style.display = 'none';
					x.done = true;
					delete request_user[x.nickname];
					return;
				}
			} // end user ban
			if (OPTIONS.change_user_background) { //random color
				let parent = x.e.parentNode.parentNode.parentNode.parentNode.parentNode;
				if (parent.className == 'content-list__item') { //comment
					//parent.style.backgroundColor = 'red';
				} else if (parent.className && parent.className.trim() == 'answer_wrapper') {
					parent = parent.children[0];
				} else parent = 0;
				if (parent) {
					function extractNumber(num) {
						num = Math.abs(num || 0);
						if (num < 10) return Math.floor(num);
						else if (num < 100) return Math.floor(num * 0.1) + 17;
						else if (num < 1000) return Math.floor(num * 0.01) + 29;
						else return 43;
					}
					let seed = ((((extractNumber(user.stat_pub) * 7 + extractNumber(user.stat_comment)) * 7 + extractNumber(user.karma))* 7 + extractNumber(user.cnt_s))*7 + extractNumber(user.cnt_q)) * 7 + extractNumber(user.cnt_a);
					let r = Math.floor(seed % 48);
					seed = Math.floor(seed / 48);
					let g = Math.floor(seed % 48);
					seed = Math.floor(seed / 48);
					let b = Math.floor(seed % 48);
					let arr = ['d','e','f'];
					parent.style.backgroundColor = 'rgb('+(r+207)+','+(g+207)+','+(b+207)+')';
				}
			}
			let html = user_html(user,true);
			if (user_html_result) {
				if (html && !x.done) {
					x.e.innerHTML += html;
					x.done = true;
				}
				delete request_user[x.nickname];
			}
			else result = false;
			let is_hint = false;
			if (!(OPTIONS.psycho_not_myself && x.nickname == owner)) {
				is_hint = !!user.hint;
				if (!is_hint && user.con > 0 && OPTIONS.psycho_summary) {
					is_hint = true
					user.blue = true //цвет обычной оценки
					if (user.con < 20) {
						user.hint = 'Новичок';
						user.note = '#Пытается освоиться с кнопками на Тостере.';
					} else if (user.con < 100) {
						user.hint = 'Любитель';
						user.note = '#Творит добро, помогает хорошим людям.';
					} else {
						user.hint = 'Профи';
						user.note = '#Знает правила Тостера.';
					}
				}
			}
			let is_ach = !!user.ach;
			if (user.cnt_s && (is_hint || is_ach)) { //Показываем статусы только после первой подгрузки информации о пользователе.
				let parent = x.e.parentNode; // element with class 'user-summary__desc'
				let myhint = parent.querySelector('span.user-summary-comfort');
				if (!myhint) {
					//fix comments
					let parent_container = parent.parentNode.parentNode.parentNode; //div
					if (parent_container.classList.contains('comment')) { //this is comment!
						if (is_hint && (OPTIONS.psycho_hide_comments
							|| x.nickname == answer_author && OPTIONS.psycho_hide_same_author
							|| OPTIONS.psycho_hide_next && users_with_info[x.nickname]))
							is_hint = false;
						if (is_ach && (OPTIONS.achiever_hide_comments
							|| x.nickname == answer_author && OPTIONS.achiever_hide_same_author
							|| OPTIONS.achiever_hide_next && users_with_info[x.nickname])) is_ach = false;
						users_with_info[x.nickname] = true;
						let cnt = (is_hint + is_ach);
						if (cnt == 0) return; // ------> don't add info and all other actions
						let body = parent_container.querySelector('.comment__body');
						if (body) {
							// -20px by default
							let marginTop = -20 + (cnt == 2 ? 25 : 15);
							body.style.marginTop = marginTop + 'px';
						}
					} else if (parent_container.classList.contains('answer')) { //this is anwer!
						answer_author = x.nickname;
						users_with_info = {};
					}
					//add info
					let about = parent.querySelector('div.user-summary__about');
					if (about) {
						parent = about;
						if (is_hint && OPTIONS.psycho_replace || is_ach && OPTIONS.achiever_replace) parent.innerText = '';
						else parent.a('br');
					}
					else parent.a('br');
					myhint = parent.a('span',null,'user-summary-comfort');
					if (is_hint) {
						let data = {style:'font-weight:bold; color:#a9bb1e;','data-psycho':user.note,'data-user':x.nickname};
						if (user.blue) data.style = 'font-weight:bold; color:#aaaaff;';
						myhint.a('span',user.hint,data);
					}
					if (is_hint && is_ach) myhint.a('br');
					if (is_ach) {
						myhint.a('span','Ачивер',{style:'font-weight:bold; color:#ed7503;','data-psycho':
							user.ach == 3 ? ' Этот пользователь является НАСТОЯЩИМ ачивером и ревниво относится к оценкам своего творчества. Если вы не уделите внимания и не отблагодарите его (кнопкой), то он может психануть и удалить свой ответ!':
							user.ach == 2 ? ' У этого пользователя КРАЙНЕ высокий процент решений. Он наверняка удалит свой ответ без отметки о решении.':
							user.ach == 1 ? ' Судя по ПОДОЗРИТЕЛЬНО высокому проценту решений, этот пользователь может удалить свой ответ, если он никому не понравится и автор вопроса не отблагодарит (кнопкой).':
							' Ошибка: '+user.ach
						});
					}
				}
			}
		});
		//log('result',result);
		//log('elem_user',elem_user);
		if (on_success && result) on_success();
		else if (on_fail && !result) on_fail();
	});
}

//page of the question
function parse_q() {
	let q = d.getElementsByClassName('user-summary__nickname');
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
				let qm = location.href.match(/qna\.habr\.com\/q\/(\d+)/);
				let tags = sel('.tags-list');
				let q_title = sel('.question__title');
				let grp = sel('.buttons-group_question');
				//log('grp',grp.className,grp);
				let btn = grp && grp.querySelector('.btn_subscribe');
				//log('btn',btn.className,btn);
				chrome.runtime.sendMessage({
					type: 'directQuestionUpdate',
					nickname:nickname,
					q_id:qm && qm[1]-0,
					tags_html: tags && tags.outerHTML,
					title: q_title && q_title.innerHTML.trim(),
					sb: btn && btn.className == 'btn btn_subscribe btn_active',
				});
				if (grp) grp.addEventListener('click',e=>{
					if (e.target.className.indexOf('btn_subscribe') === -1) return;
					btn = grp.querySelector('.btn_subscribe');
					if (!btn) return;
					chrome.runtime.sendMessage({
						type: 'directQuestionUpdate',
						nickname:nickname,
						q_id:qm && qm[1]-0,
						sb: btn && btn.className == 'btn btn_subscribe', //всё наоборот
					});
				});
			}
		}
	}
	//log(elem_user);
	update_q(null,()=> {
		let timer_index = setInterval(()=>{
			//log('timer');
			update_q(()=>{ clearInterval(timer_index); });
		},500);
		setTimeout(()=>{
			clearInterval(timer_index);
		},17000);
	});
}

//Enable/disable Ctrl+Enter handler
function set_placeholder(text) {
	const textareas = d.querySelectorAll('textarea.textarea');
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
	d.addEventListener('keydown', ctrl_enter_handler);
	set_placeholder('Жми Ctrl+Enter для отправки формы');
}

//Enable save form toLocalStorage
let all_textarea = {};
function enable_save_form_to_storage() {
	const now = (new Date()).getTime();
	for(let key in localStorage) {
		if(key[0]!='q')continue;
		try {
			let data=JSON.parse(localStorage[key]);
			if (data.ut < now - 86400000) delete localStorage[key];
		}catch(e){log('localStorage erorr:',e)}
	}
	let q = Q;
	if(!q) {
		let m = location.href.match(/^https?:\/\/qna\.habr\.com\/questionversion\/new\?question_id=(\d+)/);
		if (m) q = m[1]-0;
		else {
			m = location.href.match(/^https?:\/\/qna\.habr\.com\/question\/new/);
			if (m) q = 'new';	else return;
		}
	}
	for(let i=d.forms.length-1;i>=0;i--) {
		let f = d.forms[i], ta, tn, inputs, inp;
		if (f.classList.contains('form_comments')) tn = 'qc_'+q;
		else if (f.id == 'answer_form') tn = 'q_'+q;
		else if	(f.id.indexOf('answer_comment_form_') === 0) tn = 'qac_'+f.id.substr(20);
		else if (f.classList.contains('form_add_question')) {
			tn = 'qn_';
			inputs = {};
			if (inp = f.querySelector('input#question_title')) inputs['qntit_'] = inp;
			//if (inp = f.querySelector('input#question_tags')) inputs['qntag_'] = inp;
		} else if (f.classList.contains('form_edit_question')) { log('edit');
			tn = 'qe_'+q;
			inputs = {};
			if (inp = f.querySelector('input#question_title')) inputs['qetit_'+q] = inp;
			//if (inp = f.querySelector('input#question_tags')) inputs['qetag_'+q] = inp;
		}
		if (!tn) continue;
		if (!(ta=f.querySelector('textarea'))) continue;
		all_textarea[tn] = ta;
		restore_form_from_storage(tn);
		f.addEventListener('submit', remove_form_from_storage(tn));
		ta.addEventListener('input', save_form_to_storage(tn));
		if(inputs)for(let id in inputs) {
			all_textarea[id] = inputs[id];
			restore_form_from_storage(id);
			f.addEventListener('submit', remove_form_from_storage(id));
			inputs[id].addEventListener('input', save_form_to_storage(id));
		}
	}
}

function save_form_to_storage(id) {
	return e => {
		if (!e.target.value) {
			delete localStorage[id];
			return;
		}
		localStorage[id] = JSON.stringify({t: e.target.value, ut: (new Date()).getTime()});
	}
}

function restore_form_from_storage(id) {
	if(!localStorage[id])return;
	let data=JSON.parse(localStorage[id]);
	data.ut = (new Date()).getTime();
	localStorage[id] = JSON.stringify(data);
	all_textarea[id].value = data.t;
}

function remove_form_from_storage(id) {
	return e => delete localStorage[id];
}

let is_options_loaded = false;
let arr_on_options_callback = [];
function listenOnOptions(fn) {
	if (is_options_loaded) fn();
	else arr_on_options_callback.push(fn);
}

String.prototype.fastHashCode = function() {
	if (this.length === 0) return 0;
	let hash = 0;
	for (let i = 0; i < this.length; i++) {
		hash = ((hash<<5)-hash)+this.charCodeAt(i);
		hash = hash & hash; //32bit
	}
	return hash;
}

let aside_timer;
function updateAside(data) { //Получили новые уведомления
	if (aside_timer) {
		clearTimeout(aside_timer);
		aside_timer = undefined;
	}
	if (aside_mouseover) { //нельзя менять контент прямо под мышью.
		aside_timer = setTimeout(e=>updateAside(data),500);
		return;
	}
	let ul = sel(".events-list_navbar");
	aside_hash = data.hash;
	if (!ul) return log('Некуда вставлять уведомления');
	ul.innerHTML = data.html;
	//log('Апдейтим уведомления:',aside_hash,data.html.length,ul.innerHTML.length,data.html);
}

let window_focus = true;
window.addEventListener("blur",e=>window_focus=false);
window.addEventListener("focus",e=>window_focus=true);

let R_Q_SEARCH = /<a class="question__title-link question__title-link_list" href="https?:\/\/qna\.habr\.com\/q\/(\d+)">/;
let cache_page_1, cache_page_1_tm=0, cache_page_1_q=0, cache_page_1_q_hash=0,
	cache_my_feed, cache_my_feed_tm, cache_my_feed_q=0, cache_my_feed_hash=0;
function getInfo(info) {
	if (info.cache_page_1_tm) { //Кешированная страница 
		cache_page_1_tm = info.cache_page_1_tm;
		cache_page_1 = info.cache_page_1;
		let m = cache_page_1.match(R_Q_SEARCH);
		if (m) cache_page_1_q=m[1]-0;
	}
	if (info.cache_my_feed_tm) { //Кешированная страница 
		cache_my_feed_tm = info.cache_my_feed_tm;
		cache_my_feed = info.cache_my_feed;
		let m = cache_my_feed.match(R_Q_SEARCH);
		if (m) cache_my_feed_q=m[1]-0;
	}
	//automatic update
	if (g_status == 'all' && cache_page_1_q > 0 && cache_page_1.fastHashCode() != cache_page_1_q_hash) {
		cache_page_1_q_hash = cache_page_1.fastHashCode();
		DOM.page.innerHTML = cache_page_1;
		found_first_q_id=cache_page_1_q;
		localStorage.qcnt_all = cache_page_1_q;
		parse_questions();
	} else if (g_status == 'feed' && cache_my_feed_q > 0 && cache_my_feed.fastHashCode() != cache_my_feed_hash) {
		cache_my_feed_hash = cache_my_feed.fastHashCode();
		DOM.page.innerHTML = cache_my_feed;
		found_first_q_id=cache_my_feed_q;
		localStorage.qcnt_feed = cache_my_feed_q;
		parse_questions();
	}
	//link update
	if(cache_page_1_q > 0 && mainmenu.all){
		if (cache_page_1_q-localStorage.qcnt_all>0) mainmenu.all.a.childNodes.forEach(n=>{
			if (n.nodeType == 3 && n.data.trim().indexOf('Все вопросы')==0) n.data = 'Все вопросы ('+(cache_page_1_q-localStorage.qcnt_all)+')';
		}); else mainmenu.all.a.childNodes.forEach(n=>{
			if (n.nodeType == 3 && n.data.indexOf('Все вопросы ')==0) n.data = 'Все вопросы';
		});
	}
	if(cache_my_feed_q > 0 && mainmenu.myfeed){
		if (cache_my_feed_q-localStorage.qcnt_feed>0) mainmenu.myfeed.a.childNodes.forEach(n=>{
			if (n.nodeType == 3 && n.data.trim().indexOf('Моя лента')==0) n.data = 'Моя лента ('+(cache_my_feed_q-localStorage.qcnt_feed)+')';
		}); else mainmenu.myfeed.a.childNodes.forEach(n=>{
			if (n.nodeType == 3 && n.data.indexOf('Моя лента ')==0) n.data = 'Моя лента';
		});
	};
	//online users
	if(info.users && OPTIONS.check_online){
		while (div_online.firstChild) div_online.removeChild(div_online.firstChild);
		info.users.forEach(u=>{
			let a = div_online.a('a',0,{href:'https://qna.habr.com/user/'+u.nick+'/info'}).a('img',0,
				{src:u.img?'https://habrastorage.org/'+u.img:ext_url+'images/nouser.png', width:"35", height:"35"});
		});
		if(info.need_check)checkOnlineUsers();
		if(info.need_vote)voteOnline(info.need_vote);
	}
}

function updateInfoColor() {
	let now = (new Date()).getTime();
	if (mainmenu.all) mainmenu.all.a.style.color = (now - cache_page_1_tm < 21500) ? '#9d9' : '#a7b3cb';
	if (mainmenu.myfeed) mainmenu.myfeed.a.style.color = (now - cache_my_feed_tm < 21500) ? '#9d9' : '#a7b3cb';
}


function updateNotifications(is_first_time) {
	try {
		let is_active = (d.hidden===true
			||d.webkitHidden===true
			||d.visibilityState=='hidden'
			||d.visibilityState=='prerender'
			||window_focus===false
		) ? 1 : 0;
		chrome.runtime.sendMessage({
			type: "getNotifications",
			active: is_active,
		}, function(arr) {
			for (q_id in arr) {
				let item = arr[q_id];
				if (q_id == 1) { //Не уведомление, а просто инфа о боковой панели
					if (is_first_time) continue;
					if (aside_hash != item.hash) {
						//log('Несовпадение хеша:',item.hash,aside_hash);
						aside_hash = item.hash;
						chrome.runtime.sendMessage({type:'getAside'},updateAside);
					}
					continue;
				}
				if (q_id == 2) { 
					getInfo(item);
					continue;
				}
				let n = new Notification(item.w, {body: item.title, tag:item.title,
					icon:'https://habrastorage.org/r/w120/files/c99/6d8/5e7/c996d85e75e64ff4b6624d2e3f694654.jpg'});
				n.onclick = function(){
					window.focus();
					n.close();
					if (item.q_id) {
						let url = item.url;
						if (!url) {
							if (item.anchor) url = "https://qna.habr.com/q/"+item.q_id+"?e="+item.e+"#"+item.anchor;
							else url = "https://qna.habr.com/q/"+item.q_id;
						}
						window.location.href = url;
					}
					if (item.is_alert) {
						let al = sel('.alert');
						if (!al) {
							let notices = sel('.notices-container');
							if (notices) {
								let page = sel('.page');
								if (!page) return;
								notices = c("DIV",null,'flash-notices');
								page.insertBefore(notices, page.childNodes[0]);
							}
							notices.a(al = c("DIV",null,'alert alert_info'));
						}
						al.innerText = item.title;
					}
				}
			}
			updateInfoColor();
		});
	} catch(e) {
		//log('Extension unloaded!');
		let tag = document.activeElement.tagName.toLowerCase();
		if (tag == 'textarea' || tag == 'input') return;
		window.location.reload();
	}
}

//Добавить кнопку "Следить", чтобы получать быстрые уведомления
function addListenButton() {
	if (location.href.indexOf('https://qna.habr.com/q/') == -1) return;
	let m = location.href.match(/^https:\/\/qna\.habr\.com\/q\/(\d+)/);
	if (!m) return;
	let qnum = m[1]-0;
	let tags = sel('.question__tags');
	if (!tags) return;
	chrome.runtime.sendMessage({
		type: "getSubStatus",
		qnum: qnum,
	}, function(status) {
		const DISABLED = 'btn btn_subscribe';
		const ENABLED = 'btn btn_subscribe btn_active';
		let div = c('DIV');
		div.style.position = 'absolute';
		div.style.right = "30px";
		let a = c('A', status ? 'Отслеживается' : 'Следить', status ? ENABLED : DISABLED);
		a.title = "Получать быстрые уведомления";
		div.a(a);
		//div.innerHTML = '<a class="btn btn_subscribe btn_active" href="asd" title="Получать быстрые уведомления">Следить</a>';
		tags.a(div);
		//tags.innerHTML += '<div style="background-color:red;top: 0;left:100px;width:200px">подписаться</div>';
		a.addEventListener('click',()=>{
			if (!status) {
				let subscribe_button = did('question_interest_link_'+qnum);
				if (subscribe_button && subscribe_button.className == DISABLED) {
					subscribe_button.click();
				}
			}
			chrome.runtime.sendMessage({type: "setSubStatus", qnum:qnum}, function(new_status) {
				status = new_status;
				a.className = new_status ? ENABLED : DISABLED;
				a.innerText = new_status ? 'Отслеживается' : 'Следить';
			});
		});
	});
	
}

let aside_hash = 0;
let aside_mouseover;
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
	updateNotifications(true);
	//add subscribe button
	if (!OPTIONS.notify_all) addListenButton();
	//Пересчет уведомлений для иконки
	let ul = sel(".events-list_navbar");
	if (ul) {
		ul.addEventListener('mouseover',e=>aside_mouseover=1);
		ul.addEventListener('mouseout',e=>aside_mouseover=0);
		let counter = ul.querySelector(".events-list__item_more");
		let m, cnt;
		if (counter && (m = counter.innerHTML.match(/<span>(\d+)<\/span>/))) {
			cnt = m[1] - 0;
		} else {
			let lis = ul.querySelectorAll(".events-list__item a");
			cnt = lis.length;
			if (cnt && lis[cnt-1].href == "https://qna.habr.com/my/tracker") cnt--;
		}
		aside_html = ul.innerHTML.replace(' style="overflow-wrap: break-word;"','');
		aside_hash = aside_html.fastHashCode();
		//log('Хеш при загрузке:',aside_hash,aside_html.length,aside_html);
		chrome.runtime.sendMessage({type: "updateIconNum", cnt:cnt, hash:aside_hash, html:aside_html});
	}
}

//Блокировка рекламы, Виджет
let widget_version,div_online;
function AsideRightFilters() {
	removeCustomCSS(css_right_hide);
	if (!(OPTIONS.aside_right_hide==1 || OPTIONS.aside_right_noads==1 || OPTIONS.is_widget==1 || OPTIONS.top24_show!=1)) return;
	let aside = d.getElementsByClassName('column_sidebar')[0];
	if (!aside) return log('Правая колонка не найдена');
	if (OPTIONS.aside_right_noads==1) { //скрыть всю рекламу
		let promo = sel('.promo-block');
		if (promo) promo.style.display = 'none';
		//for sure
		let imgs = aside.getElementsByTagName('img');
		for(let i=0;i<imgs.length;i++) {
			let img = imgs[i];
			img.style.display = 'none';
			img.parentNode.style.display = 'none';
		}
		//empty block
		let empty = sel('.empty-block');
		if(empty)empty.style.display='none';
		//мегапосты
		let mega = sel('.bmenu_inner');
		if (mega) mega.style.display='none';
	}
	for (let i=0;i<aside.children.length;i++) {
		let dl = aside.children[i];
		if (OPTIONS.aside_right_hide == 1
			|| OPTIONS.aside_right_noads==1 && (dl.getAttribute('role') != 'most_interest' || !OPTIONS.top24_show) && dl.className != 'panel-heading'
		)
			dl.style.display = 'none';
	}
	if (OPTIONS.is_widget) {
		let widget = c('dl',0,'panel-heading panel-heading_inner')
		let add=e=>widget.a('dd',0,'panel-heading__content panel-heading__content_inner');
		widget.a('dt','Toster Comfort ','panel-heading__title panel-heading__title_underline')
			.a('span',manifest.version_name || manifest.version, OPTIONS.is_new && 'tc_new');
		
		if(OPTIONS.is_debug)add().a('a','Перезагрузить расширение',{href:'#'}).addEventListener('click',e=>{
			chrome.runtime.sendMessage({type:'Reload'}); //todo: не всегда перезагружается
			if(!OPTIONS.enable_notifications) setTimeout(e=>window.location.reload(),1000);
			e.preventDefault()
		});
		if(OPTIONS.is_options_button){
			add().a('a','Настройки',{href:ext_url+('options.html'),target:'_blank'});
		}
		if(OPTIONS.show_rules) add().a('a','Правила',{href:'https://qna.habr.com/help/rules',target:'_blank'});
		if (owner && OPTIONS.is_search) {
			let search = add();
			search.a('span','Поиск по моим вопросам/ответам:').a('br');
			search.a('input').addEventListener('keydown',e=>{
				if(e.key !== 'Enter' || !e.target.value) return;
				let w=window.open('https://www.google.com/search?q='+owner+'+'+encodeURIComponent(e.target.value).replace(' ','+')+' site:qna.habr.com/q/');
			});
		}
		if(OPTIONS.check_online){
			div_online=add().a('div',0,'online_box');
		}
		if(OPTIONS.read_q && Q) add().a('a','Очистить уведомления',{href:'#'}).addEventListener('click',e=>{
			chrome.runtime.sendMessage({type:'clearQuestion',q_id:Q});
			e.preventDefault()
		});
		aside.insertBefore(widget,aside.children[0]);
	} else {
		OPTIONS.check_online=0;
	}
}

//Скрыть верхнюю строку и выцепить оттуда лого
function HideTMPanel() {
	let panel = sel('#TMpanel');
	if (panel) {
		if (OPTIONS.hide_tm_panel) panel.style.display='none';
		else panel.style.display='block';
	}
	let logo = sel('.logo-wrapper');
	if (OPTIONS.move_logo_to_menu) {
		let left = sel('.layout__navbar');
		if (logo && left) {
			let padding = OPTIONS.resurrect_toster_logo_height ? "19" : "9";
			let height = OPTIONS.resurrect_toster_logo_height ? "65" : "48";
			let div = c('div',0,{style:'padding:'
				+padding+'px;background-color:#424b5f;min-width:0px;text-align:center;height:'
				+height+'px;display:block'});
			left.insertBefore(div,left.children[0]);
			div.a(logo);
			logo.style.textAlign = 'center';
			//restore styles
			div.id = 'TMpanel';
			//let control = logo.querySelector('#dropdown-control');
			//if (control) {
			//}
			let dropdown = logo.querySelector('#dropdown');
			if (dropdown) {
				//dropdown.style.maxWidth = '350px';
				//dropdown.style.width = '350px';
				dropdown.style.textAlign = 'left';
				dropdown.style.left = '0px';
			}
		}
	}
	if (OPTIONS.resurrect_toster_logo) { //ext_url+'images/toster_logo_white.png'
		let a = logo.querySelector('a.logo');
		if (!a) a = logo.querySelector('a');
		if (!a) log('Logo image not found!');
		else {
			while (a.firstChild) a.removeChild(a.firstChild);
			a.a('img',0,{src:ext_url+'images/toster_logo_white.png'});
		}
		//change all the text
		if (URL && URL.indexOf('help/') === 0) {
			const REPLACE = [
				['заходите на','Тостер'],
				['деология','Тостера'],
				['иссия','Тостера'],
				['ользователи','Тостера'],
				['на','Тостере'],
				['На','Тостере'],
			];
			let pp = [...(d.querySelectorAll('p') || [])].concat(...(d.querySelectorAll('h4')||[]));
			if(pp)pp.forEach(p=>{
				let text = p.innerText;
				let found = text.indexOf("Хабр Q&A") !== -1;
				if (!found) return;
				if (REPLACE.find(e=>{
					if(text.indexOf(e[0])===-1)return;
					let pattern = e[0] + ' «Хабр Q&A»';
					if (text.indexOf(pattern) !== -1) return p.innerText = text.replace(pattern, e[0] + ' «'+e[1]+'»');
					pattern = e[0] + ' «Хабр Q&A»';
					if (text.indexOf(pattern) !== -1) return p.innerText = text.replace(pattern, e[0] + ' «'+e[1]+'»');
					pattern = e[0] + ' Хабр Q&A';
					if (text.indexOf(pattern) !== -1) return p.innerText = text.replace(pattern, e[0] + ' '+e[1]+'');
					pattern = e[0] + ' Хабр Q&A';
					if (text.indexOf(pattern) !== -1) return p.innerText = text.replace(pattern, e[0] + ' '+e[1]+'');
				}) === undefined && text.indexOf('Хабр Q&A') !== -1) {
					p.innerText = text.replace('Хабр Q&A', 'Тостер');
				}
			});
		}
	}
}

//Добавляет пункты в главное меню
function AsideMenu() {
	//if (!(OPTIONS.show_my_questions || OPTIONS.show_my_answers)) return;
	if(mainmenu.all) mainmenu.all.a.addEventListener('click',e=>{
		let now = (new Date()).getTime();
		if (now-cache_page_1_tm < 25000 && DOM.page) { //Есть кешированная версия вопросов
			DOM.page.innerHTML = cache_page_1;
			found_first_q_id=cache_page_1_q;
			localStorage.qcnt_all = cache_page_1_q;
			parse_questions();
			g_status='all';
			e.preventDefault();
			document.body.scrollTop = document.documentElement.scrollTop = 0;
		}
	});
	if(mainmenu.myfeed) mainmenu.myfeed.a.addEventListener('click',e=>{
		let now = (new Date()).getTime();
		if (now-cache_my_feed_tm < 25000 && DOM.page) { //Есть кешированная версия вопросов
			DOM.page.innerHTML = cache_my_feed;
			found_first_q_id=cache_my_feed_q;
			localStorage.qcnt_feed = cache_my_feed_q;
			parse_questions();
			g_status='feed';
			e.preventDefault();
			document.body.scrollTop = document.documentElement.scrollTop = 0;
		}
	});
	//ниже старый код, не трогаем
	if(!owner) return log('logged out');
	let main_menus = d.querySelectorAll('.main-menu');
	let menu_item, main_menu, user_menu;
	let menu_arr = {};
	for(let i=main_menus.length-1;i>=0;i--){
		let item = main_menus[i].children[0];
		if (item) {
			if (item.innerText.trim() == 'Моя лента') {
				menu_item = item.nextElementSibling;
				main_menu = main_menus[i];
				for(let j=main_menu.children.length-1;j>=0;j--){
					let it = main_menu.children[j];
					if (it.classList.contains('main-menu__item')) {
						let name = it.innerText.trim();
						if (name != '') menu_arr[name] = it;
					}
				}
			}
			else if (item.innerText.trim() == 'Настройки') {
				user_menu = main_menus[i];
			}
		}
	}
	if (!menu_item) return log('Main menu not found.');
	if (OPTIONS.show_my_questions) {
		let e = menu_item.cloneNode(true);
		let a = e.children[0];
		if (a && a.tagName == 'A' && a.childNodes[2] && a.childNodes[2].nodeType == 3) {
			a.childNodes[2].nodeValue = 'Мои вопросы';
			a.href = 'user/'+owner+'/questions';
			main_menu.appendChild(e);
		}
	}
	if (OPTIONS.show_my_answers) {
		let e = menu_item.cloneNode(true);
		let a = e.children[0];
		if (a && a.tagName == 'A' && a.childNodes[2] && a.childNodes[2].nodeType == 3) {
			a.childNodes[2].nodeValue = 'Мои ответы';
			a.href = 'user/'+owner+'/answers';
			main_menu.appendChild(e);
		}
	}
	if (OPTIONS.show_my_comments) {
		let e = menu_item.cloneNode(true);
		let a = e.children[0];
		if (a && a.tagName == 'A' && a.childNodes[2] && a.childNodes[2].nodeType == 3) {
			a.childNodes[2].nodeValue = 'Мои комментарии';
			a.href = 'user/'+owner+'/comments';
			main_menu.appendChild(e);
		}
	}
	if (OPTIONS.show_my_likes) {
		let e = menu_item.cloneNode(true);
		let a = e.children[0];
		if (a && a.tagName == 'A' && a.childNodes[2] && a.childNodes[2].nodeType == 3) {
			a.childNodes[2].nodeValue = 'Мои лайки';
			a.href = 'user/'+owner+'/likes';
			main_menu.appendChild(e);
		}
	}
	if (OPTIONS.show_my_tags) {
		let e = menu_item.cloneNode(true);
		let a = e.children[0];
		if (a && a.tagName == 'A' && a.childNodes[2] && a.childNodes[2].nodeType == 3) {
			a.childNodes[2].nodeValue = 'Мои теги';
			a.href = 'user/'+owner+'/tags';
			main_menu.appendChild(e);
		}
	}
	if (!user_menu) return log('User submenu not found.');
	if (OPTIONS.hidemenu_all_tags) {
		let item = menu_arr['Все теги'];
		if (item) user_menu.a(item);
	}
	if (OPTIONS.hidemenu_all_users) {
		let item = menu_arr['Пользователи'];
		if (item) user_menu.a(item);
	}
	if (OPTIONS.hidemenu_all_notifications) {
		let item = menu_arr['Уведомления'];
		if (item) user_menu.a(item);
	}
}

const shortDesc = {
	'Автор вопроса':'Автор',
	'Отмечено решением':'Решение',
	'Отметить решением':'Мнение',
	'Нравится':'Лайк',
	'комментарий':'коммент', 'комментария':'коммента', 'комментариев':'комментов',
	'Комментировать':'Коммент',
}
let makeShort=s=>shortDesc[s]||s||'???';

//Сокращаем все названия, убираем мусор
function FilterCurator() {
	if (!OPTIONS.minify_curator) return;
	let spans = d.querySelectorAll('span.author_mark');
	for(let i=0;i<spans.length;i++) {
		let s = spans[i].innerText;
		if (s.indexOf('Куратор тега ') === 0) spans[i].innerText = s.substr(13);
		if (s.indexOf('Автор вопроса, куратор тега ') === 0) spans[i].innerText = 'Автор, '+s.substr(28);
		else if (shortDesc[s]) spans[i].innerText = shortDesc[s];
	}
}

function FilterDesc() {
	return; //Что-то плохо работает. Отключено.
	if(!OPTIONS.minify_names) return;
	d.querySelectorAll('span[data-voted-msg]').forEach(e=>{
		e.setAttribute('data-voted-msg', makeShort(e.getAttribute('data-voted-msg')));
		e.setAttribute('data-not-voted-msg', makeShort(e.getAttribute('data-not-voted-msg')));
		e.innerText = makeShort(e.innerText);
	});
	d.querySelectorAll('a.btn_like').forEach(e=>{
		let node = e.childNodes[0];
		if (!node || node.nodeType != 3) return;
		node.data = makeShort(node.data.trim());
	});
	d.querySelectorAll('a.btn_comments-toggle').forEach(e=>{ //btn btn_link btn_comments-toggle
		if(e.children[0] && e.children[0].tagName.toLowerCase() == 'span') e = e.children[0];
		let node;
		for(let i=e.childNodes.length-1;i>=0;i--) {
			if (e.childNodes[i].nodeType == 3 && e.childNodes[i].data.trim()) node = e.childNodes[i];
		}
		if (node) node.data = makeShort(node.data.trim());
	});
}

function RemoveTESpam() {
	if (!OPTIONS.remove_te_spam) return;
	let notices_container = sel('.flash-notices');
	if (notices_container) {
		let observer = new MutationObserver(function(mutationsList, observer) {
			for(var mutation of mutationsList) {
				if (mutation.type == 'childList') {
					//log('A child node has been added or removed.');
					for(let i=0;i<mutation.addedNodes.length;i++){
						let n = mutation.addedNodes[i];
						if (n.innerHTML.indexOf('Настройки Toster Extension изменены') > -1) {
							n.parentNode.removeChild(n);
						}
					}
				}
				else if (mutation.type == 'attributes') {
					//log('The ' + mutation.attributeName + ' attribute was modified.');
				}
				//else log('Mutation '+mutation.type );
				//log(mutation);
			}
		});
		observer.observe(notices_container, {
			attributes:true, childList:true, subtree:true, characterData:true,
		});
	}
}

function HideSolButton() {
	if (OPTIONS.hide_sol_button == 1) {
		let q = d.getElementsByClassName('buttons-group_answer');
		for(let i=0;i<q.length;i++) {
			let sol = q[i].querySelector('span.btn_solution');
			if (sol) sol.style.display = 'none';
		}
	} else if (OPTIONS.swap_buttons == 1) {
		let q = d.getElementsByClassName('buttons-group_answer');
		for(let i=0;i<q.length;i++) {
			let sol = q[i].querySelector('span.btn_solution');
			let like = q[i].querySelector('a.btn_like');
			if (sol && like) {
				q[i].insertBefore(like, sol);
			}
		}
	}
}

function DateTimeReplace() {
	if (OPTIONS.datetime_replace == 1) {
		let now = (new Date()).getTime();
		let t = d.getElementsByTagName('time');
		for(let i=0;i<t.length;i++) {
			let title = t[i].title;
			let datetime = t[i].dateTime;
			if (datetime && now - (new Date(datetime)).getTime() > OPTIONS.datetime_days * 24 * 60 * 60000) {
				if (title && title.indexOf('Дата публикации: ') > -1) t[i].innerHTML = title.substr(17);
			}
		}
	}
}

let OPTIONS = {};
// Change page according to options
function parse_opt() {
	let q = Q && {
		id: Q,
	};
	checkPoint('send options');
	chrome.runtime.sendMessage({
		type: "getOptions",
		q: q || 0,
	}, function(options) {
		checkPoint('got options');
		if (!options) return log('TC IS NOT LOADED!!');
		OPTIONS = options;
		sandbox(HideSolButton);
		if (options.show_habr == 1) {
			let q = d.getElementsByClassName('buttons-group_answer');
			for(let i=0;i<q.length;i++) {
				q[i].style.display = '';
			}
		}
		if (options.hide_offered_services == 1 || options.aside_right_noads == 1) {
			let q = d.getElementsByClassName('offered-services');
			for (let i=0;i<q.length;i++) {
				q[i].style.display = 'none';
			}
		}
		if (options.aside_right_noads == 1) { //Скрыть прочую всплывающую рекламу
			function RemoveAlerts() {
				let info = sel('.alert_info');
				if (!info) return;
				info.style.display = 'none';
			}
			sandbox(RemoveAlerts); //Пустой div уже есть на момент проверки.
		}
		if (options.use_ctrl_enter == 1) sandbox(set_ctrl_enter_handler);
		if (options.save_form_to_storage == 1) sandbox(enable_save_form_to_storage);
		arr_on_options_callback.forEach(fn=>sandbox(fn));
		is_options_loaded = true;
		//Manage notifications
		if (options.enable_notifications == 1) sandbox(initNotifications);
		sandbox(DateTimeReplace);
		//Aside filters
		sandbox(AsideRightFilters);
		//TMPanel
		sandbox(HideTMPanel);
		//Aside menu
		sandbox(AsideMenu);
		sandbox(FilterCurator);
		sandbox(RemoveTESpam);
		sandbox(FilterDesc);
		if (options.add_comment_lines) sandbox(addCanvasToComments);
		sandbox(convertTagsToShort);
		checkPoint('did options');
	});
}

//Уменьшаем длину тегов (по умолчанию выкл)
function convertTagsToShort() {
	if (!OPTIONS.short_tags) return;
	let all = d.querySelectorAll('.tags-list');
	if(!all) return;
	all.forEach(li=>{
		let a = li.querySelector('a');
		if(!a) return log('No tag in:',li.innerText);
		a.innerText = makeShortTags(a.innerText);
	});
}

//Добавляем сноски в сложное дерево комментариев
function addCanvasToComments() {
	var base_offset_el;
	function getOffset(el) {
		let x = 0, y = 9;
		while( el && el != base_offset_el && !isNaN( el.offsetLeft ) && !isNaN( el.offsetTop ) ) {
			x += el.offsetLeft - el.scrollLeft;
			y += el.offsetTop - el.scrollTop;
			el = el.offsetParent;
		}
		return { y: y, x: x };
	}
	function removeCanvas(e) {
		while (e) {
			if (e.is_canvas_created) {
				let canvas = e.querySelector('canvas');
				if (canvas) canvas.parentNode.removeChild(canvas);
				e.is_canvas_created = false;
				return e; //done
			}
			e = e.parentNode;
		}
	}
	//Проверяет открытые комменты и добавляет слой со сносками.
	function checkCommentCanvas() { //log('checkCommentCanvas');
		let arr1 = [...d.querySelectorAll('.answer__comments')];
		let arr2 = [...d.querySelectorAll('.question__comments')];
		arr1.concat(arr2).forEach(e=>{
			setTimeout(()=>{ //Предвкушаем быструю загрузку, хотя это может быть не так!
				let e_rect = e.getBoundingClientRect();
				if (e.is_canvas_created && e_rect.height != e.canvas_created_height) {
					removeCanvas(e);
					checkCommentCanvas();
				}
			},1000);
			if (e.is_canvas_created) return; //log('aready done'); log('start process');
			let e_rect = e.getBoundingClientRect();
			if (e_rect.left == 0) return;
			let answer_item = e.parentNode.parentNode;
			let role = answer_item.getAttribute('role');
			if ((!role || role.trim() != 'answer_item') && answer_item.id != 'question_show') return;
			//let item_rect = answer_item.getBoundingClientRect();
			let WIDTH = e_rect.width;
			let HEIGHT = e_rect.height;
			let canvas = c('canvas',0,'comfortLines');
			e.canvas_created_height = HEIGHT;
			//canvas.style.backgroundColor = 'red';
			canvas.setAttribute('width',WIDTH + 'px');
			canvas.setAttribute('height',HEIGHT + 'px');
			canvas.style.width = WIDTH + 'px';
			canvas.style.height = HEIGHT + 'px';
			let ctx = canvas.getContext("2d");
			ctx.globalAlpha = 0.2;
			//ctx.fillStyle = "red"; //test
			//ctx.fillRect(0, 0, WIDTH, HEIGHT);
			e.insertBefore(canvas,e.children[0]);
			e.is_canvas_created = true;
			base_offset_el = canvas.offsetParent;
			let c_ofs = getOffset(canvas);
			let links = canvas.parentNode.querySelectorAll('a');
			let last_avatar;
			let avatars = {};
			ctx.beginPath();
			ctx.strokeStyle = 'rgb(0, 0, 0)';
			ctx.lineWidth = 2;
			if (links) links.forEach(a=>{
				if (!a.href || a.href.indexOf('//qna.habr.com/user/') === -1) return; //4 - nick, 5 - empty
				let nickname_arr = a.href.split('/');
				if (nickname_arr.length > 6 || nickname_arr.length == 6 && nickname_arr[5]) return; //левые ссылки, ведут не в корень профиля
				let nickname = nickname_arr[4];
				if (a.className && a.className != 'user-summary__avatar') return;
				let ofs = getOffset(a);
				let rect = a.getBoundingClientRect();
				rect.w = rect.right - rect.left;
				rect.h = rect.bottom - rect.top;
				let x1 = ofs.x - c_ofs.x - 0;
				let y1 = ofs.y - c_ofs.y;
				if (a.className) {
					let ava = {
						a: a,
						x1: x1, y1: y1,
						rect: rect,
					};
					avatars[nickname] = ava;
					return;
				} else if (a.className) return; //все стилизованные - не в тексте коммента
				//простая ссылка. Делаем рамку и линию
				let ava = avatars[nickname];
				if (!ava) return;
				//есть связь с предыдущим оратором
				ctx.rect(x1, y1, rect.width, rect.height);
				//ctx.stroke();
				//линию к аватарке
				let x0 = x1 + rect.width * 0.5;
				ctx.moveTo(x0, y1);
				ctx.lineTo(ava.x1 + ava.rect.width * 0.5, ava.y1 + ava.rect.height);
				//let x2 = ava.x1 + ava.rect.width * 0.5;
				//let y2 = ava.y1 + ava.rect.height;
				//ctx.quadraticCurveTo(0, (y2+y1) * 0.5, x2, y2);
			});
			ctx.stroke();
		});
	}
	var buttons = d.querySelectorAll('.btn_comments-toggle');
	buttons.forEach(e=>e.addEventListener('click',e=>{
		setTimeout(checkCommentCanvas,0);
	}));
	buttons = d.querySelectorAll('a.menu__item-link');
	buttons.forEach(e=>e.addEventListener('click', e=>{ //log('link')
		let txt = e.target.innerText
		if (txt != 'Редактировать') return; //log('edit link')
		if (!(e = removeCanvas(e.target))) return;
		let cnt = 0;
		let id = setInterval(()=> {
			cnt++;
			if (cnt > 100) return clearInterval(id);
			let rect = e.getBoundingClientRect();
			if (rect.height != e.canvas_created_height) {
				cnt = 99;
				checkCommentCanvas();
				patchButtons(); //patch again
			}
		},0);
	}));
	buttons = d.querySelectorAll('.spoiler_title');
	buttons.forEach(e=>e.addEventListener('click',e=>{
		if (!(e = removeCanvas(e.target))) return;
		setTimeout(checkCommentCanvas,1000);
	}));
	buttons = null;
	function patchButtons() {
		var buttons = d.querySelectorAll('button.btn');
		buttons.forEach(e=>{
			if (e.is_canvas_already_patched) return;
			e.is_canvas_already_patched = true;
			e.addEventListener('click',e=>{ //log('button')
				let txt = e.target.innerText
				if (!txt) return; //log('no text');
				txt = txt.trim();
				if (txt != 'Отправить' && txt != 'Отменить') return; //log('button send')
				if (!(e = removeCanvas(e.target))) return;
				let cnt = 0;
				let id = setInterval(()=> {
					cnt++;
					if (cnt > 99) return clearInterval(id);
					let rect = e.getBoundingClientRect();
					if (rect.height != e.canvas_created_height) {
						cnt = 99;
						checkCommentCanvas();
					}
				},100);
			});
		});
	}
	//если попали из уведомления, ветка может быть уже раскрыта, нужно проверить.
	setTimeout(()=>{
		checkCommentCanvas();
		patchButtons();
	},0); //но не сразу, а после добавления описаний
}

//Раскрашиваем ответы пользователя в его профиле
function parse_anwer_colors() {
	if (!OPTIONS.mark_anwers_by_color) return;
	let good = 0, notbad = 0, zero = 0;
	d.querySelectorAll('.answer_wrapper').forEach(wrapper=>{
		let is_solution = wrapper.children[0].classList.contains('answer_solution');
		let likes = 2;
		let btn_like = wrapper.querySelector('.btn_like');
		if (btn_like) {
			if (btn_like.getAttribute('data-answer_like_count') == '0') likes = 0;
			else if (btn_like.getAttribute('data-answer_like_count') == '1') likes = 1;
			else {
				let meta = btn_like.querySelector('meta[itemprop="upvoteCount"]');
				if (meta) {
					if (meta.getAttribute('content') == '0') likes = 0;
					else if (meta.getAttribute('content') == '1') likes = 1;
				}
			}
		}
		let score = likes + (is_solution ? 2 : 0);
		let col, col_code;
		if (score == 0) {
			col = '#fcc';
			col_code = '#ffe2e2';
			zero++;
		} else if (score == 1) {
			col = '#ffc';
			col_code = '#ffffe2';
			notbad++;
		} else { // score >= 2
			col = '#cfc';
			col_code = '#e2ffe2';
			good++;
		}
		if (col) {
			wrapper.style.backgroundColor = col;
			let pres = wrapper.querySelectorAll('pre');
			if (pres) pres.forEach(pre=>{
				pre.style.backgroundColor = col_code;
			});
			let codes = wrapper.querySelectorAll('code');
			if (codes) codes.forEach(code=>{
				code.style.backgroundColor = col_code;
			});
		}
	});
	if (!OPTIONS.mark_answers_count) return;
	let page_body = sel('.page__body');
	if (!page_body) return log('Error: page__body not found!');
	let bar = c('div',0,{style:'width:100%;text-align: center'});
	bar.a('span',' Хорошие ответы: '+good,{style:'font-weight:bold;color:#0a0'});
	bar.a('span',' Так себе ответы: '+notbad,{style:'font-weight:bold;color:#ec0'});
	bar.a('span',' Скучные ответы: '+zero,{style:'font-weight:bold;color:#f99'});
	page_body.parentNode.insertBefore(bar, page_body);
}

function addCustomCSS(css) {
	let pt = d.head || d.children[0];
	let e = css.substr(0,4) == 'http'? c('link',0,{rel:'stylesheet',type:'text/css',href:css}) : c('style',css);
	pt.a(e);
}
function removeCustomCSS(css) {
	let arr = d.getElementsByTagName('style');
	for (let i=0, max = arr.length; i < max; i++) {
		if (arr[i].innerText == css) {
			arr[i].parentNode.removeChild(arr[i]);
			break;
		}
	}
}

const NAMES = {
	'question question_full':'tfull', 'question__additionals':'rest',
	'question-head':'head', 'question__tags':'tags', 'question__title':'title', 'question__body':'body',
	'question__comments-link':'coml', 'buttons-group_question':'btn', 'question__comments':'com',
	'user-summary_question':1,
	'user-summary__avatar':'avatar', 'user-summary__desc':'desc',
	'user-summary__name':'name', 'user-summary__nickname':'nick', 'user-summary__about':'about',
	'question__text':'text', 'question__attrs':'attr',
};
const DOM = {};
function getDOM(obj,el,names) { //Вынимает из el объекты с классами из names и кладёт в obj под именами из NAMES
	for(let i=el.children.length-1;i>=0;i--) {
		let e=el.children[i],optional;
		let name = names.pop();
		if (name===0) {
			optional = true;
			name = names.pop();
		}
		if(!name)break;
		if(e.className.indexOf(name)===-1) {
			log('Warning! Wrong order for element:',name);
			e = el.querySelector('.'+name); //slow
			if(!e) {
				if (optional) e = '';
				else return log('Unknown element:',el.children[i].className,'Need:',name);
			}
		}
		if(!obj)return e;
		name=NAMES[name] || name;
		obj[name]=e;
	}
	if(names.length>0){
		log('Warning! Not finished:',names);
		let bad = names.find(n=>!(obj[NAMES[n]||n]=el.querySelector('.'+n)));
		if(bad)return log('Element not found:',bad);
	}
	return obj;
}
function getUL(obj,el,cls,names) {
	for(let i=el.children.length-1;i>=0;i--) {
		let e=el.children[i];
		if(e.className.indexOf(cls)===-1)log('Warning! Wrong class in UL:',e.className,'Need:',cls);
		let name = names.pop();
		if(!name)return log('Кончились имена для UL:',el);
		obj[name] = e;
	}
	if(names.length)log('Warning! Лишние имена для UL:',names);
	return obj;
}
function parseDOM_question(Q) {
	//https://qna.habr.com/q/630303
	let rest,n;
	if(!(DOM.show = did('question_show'))) return log('No content area!');
	if(!getDOM(DOM,DOM.show,['question question_full', 'question__additionals'])) return;
	if(!getDOM(DOM,DOM.tfull,['question-head', 'question__tags', 'question__title',
		'question__body', 'question__comments-link', 'buttons-group_question', 'question__comments'])) return;
	DOM.title = DOM.title.innerText;
	if(!(DOM.qsum = getDOM(0,DOM.head,['user-summary_question']))) return log('No summary!');
	if(!(DOM.qsum = getDOM({},DOM.qsum,['user-summary__avatar', 'user-summary__desc']))) return;
	if(n=DOM.qsum.avatar.querySelector('img')) DOM.qsum.avatar = n.src; else {DOM.qsum.avatar=''; log('No avatar!'); }
	if(!(DOM.qsum.desc = getDOM({},DOM.qsum.desc,['user-summary__name', 'user-summary__nickname', 'user-summary__about',0]))) return;
	if(!(DOM.body=getDOM({},DOM.body,['question__text', 'question__attrs']))) return;
	if(!getUL(DOM.body,DOM.body.attr,'inline-list__item',['pubdate','views'])) return;
	if (DOM.body.pubdate) { //может быть false для только что созданного (методом post) вопроса
		if(n=DOM.body.pubdate.querySelector('time')) DOM.body.pubdate=n.dateTime; else return log('No post time!');
	}
	if (DOM.body.views) {
		if(n=DOM.body.views.querySelector('.question__views-count')) DOM.body.views=parseInt(n.innerText); else return log('No views!');
	}
	return true;
}
function parseDOM_mainmenu() {
	d.querySelectorAll('ul.main-menu').forEach(mm=>{
		mm.querySelectorAll('li.main-menu__item').forEach(e=>{
			let a = e.children[0]; if(a.tagName!='A')return console.log('No link');
			let name = a.innerText.trim();
			if (name == "Моя лента") mainmenu.myfeed = {e:e,a:a};
			else if (name == "Все вопросы") mainmenu.all = {e:e,a:a};
		});
	});
	DOM.mainmenu = mainmenu;
	return true;
}
function parseDOM_getNickname(){
	let user_side = sel('.user-panel__side');
	if(user_side){
		let a = user_side.querySelector('.user-panel__user-name');
		if(a && a.tagName=='A'){
			let m = a.href.match(/https?:\/\/qna\.habr\.com\/user\/([^\/?"]*)/);
			if(m) owner = m[1];
		}
	}
}


//анализируем страницу полностью
function parseDOM() {
	DOM.page=sel('div.page');
	sandbox(parseDOM_getNickname);
	sandbox(parseDOM_mainmenu);
	let m = location.href.match(/^https?:\/\/qna\.habr\.com\/(.*)$/);
	if (!m) return log('Wrong URL:',location.href);
	URL = m[1];
	if(m = URL.match(/^q\/(\d\d+)/)){
		Q = m[1]-0;
		return sandbox(e=>parseDOM_question(Q));
	}
	return true;
}

//Функция получает список субъективных оценок и применяет к списку пользователей (меню все пользователи).
function ParseUserList() {
	if (!OPTIONS.show_psycho) return;
	//Формируем список пользователей.
	let cards = [...d.querySelectorAll('.card')].filter(e=>e.querySelector('.card__head_user') && true || false);
	if (cards.length != 30) log('User cards = '+cards.length);
	let users = {}; // nick:el
	let nicknames = [];
	cards.forEach(e=>{
		let a = e.querySelector('h2.card__head-title > a');
		if (!a) return;
		if (a.href.indexOf("https://qna.habr.com/user/") !== 0) return;
		let nick = a.href.substr(26).trim();
		if(nick=='') return;
		nicknames.push(nick);
		users[nick] = e;
	});
	//Получаем данные о них.
	chrome.runtime.sendMessage({
		type: "getHints",
		nicknames: nicknames,
	}, function(data) {
		for(let nick in users) {
			let e = users[nick];
			let head = e.querySelector('.card__head_user');
			head.style.minHeight = '145px';
			let info = e.querySelector('.card__head-subtitle');
			let o = data[nick];
			if(!o)o={hint:'',note:''};
			let myhint=c('div',null,{class:'user-summary-comfort',style:'height:20px;font-size:16px;line-height:14px'});
			let t = myhint.a('span',o.hint,{style:'font-weight:bold; color:#a9bb1e;','data-psycho':o.note,'data-user':nick});
			let h = 16;
			let check_id = o.hint && setInterval(()=>{
				let divHeight = t.offsetHeight;
				if (divHeight <= 20 || h < 5) return clearInterval(check_id);
				h--;
				myhint.style.fontSize = h + 'px';
			},0);
			if (info) {
				head.insertBefore(myhint,info);
			} else { //no info
				head.a(myhint);
			}
		}
	});
}

//Добавляем данные в профиль пользователя, которых там нет.
function parse_user_profile() {
	let list = sel('.inline-list_centered');
	let nickname = URL.split('/')[1]; // user/myname[/...]
	if (!list) return log('List with info not found!');
	function addInfo(val, col, hint, url) { //значение, цвет значения, подсказка в одно слово, [URL]
		let main_el = c(url ? 'a' : 'span', 0, 'mini-counter');
		if (url) main_el.href = url;
		main_el.a('div',val,'mini-counter__count').style.color = col;
		main_el.a('div',hint,'mini-counter__value');
		list.a('li',0,'inline-list__item inline-list__item_bordered').a(main_el);
	}
	let done = 0;
	function checkInfo() {
		chrome.runtime.sendMessage({
			type: "getUsers",
			arr: {[nickname]: 1},
		}, function(data) {
			let user = data[nickname];
			if (!user || user.solutions === undefined) return;
			if (done < 1) {
				if (user.solutions != -1) addInfo(user.solutions+'%', 'black', 'отметки', 'https://github.com/MarisKori/Toster-Comfort/wiki');
				let respect = countRespect(user);
				addInfo(respect.toFixed(1), '#ff9040', 'польза');
				done = 1;
			}
			if (user.karma !== undefined) {
				if (!isNaN(parseFloat(user.karma)))
					addInfo((user.karma < 0 ? '' : '+') + user.karma, user.karma < 0 ? 'red' : '#6c8d00', 'карма');
				else {
					let k = user.karma === 'r' ? 'read-only' : (user.karma === 'n' ? 'нет реги' : user.karma);
					addInfo(k === 'read-only' ? 'нет' : k, '#898D92', 'карма', k === 'read-only' ? 'https://habr.com/users/' +user.nickname+ '/' : 0);
				}
				if (user.reg) {
					let arr = getDateStr(user.reg).split(' ');
					addInfo(arr[0], '#777', arr[1]);
				}
				done = 2;
				list.querySelectorAll('li').forEach(e=>{
					e.style.width = '87px';
				});
			}
		});
	}
	checkInfo();
	let cnt = 0;
	let id = setInterval(e=>{
		if (done == 2 || cnt > 30) return clearInterval(id);
		cnt++;
		checkInfo();
	}, 500);
}


d.addEventListener('DOMContentLoaded', e=>{ // <------------ !!!!!
	checkPoint('<--- LOAD EVENT');
	if(!parseDOM()) checkPoint('DOM parse error!'); else checkPoint('DOM loaded.');
	//log('DOM:',DOM);
	parse_opt();
	addCustomCSS(css_global);
	window.scroll(0,48); //hide panel after applying css
	//if (URL.indexOf('user/')===0 && !URL.match(/^user\/[^\/]+/iquestions/)
	if (URL.indexOf('q/') === 0 || URL.indexOf('answer') === 0) {
		sandbox(parse_q);
		g_status = 'q';
		checkPoint('question parsed');
	}
	else {
		if (!URL.match(/^user\/.*\/questions/)) listenOnOptions(parse_questions);
		if (URL.match(/^user\/.*\/answers/)) listenOnOptions(parse_anwer_colors);
		if (URL.match(/^user\//)) listenOnOptions(parse_user_profile);
		if (URL=='questions')g_status='all';
		if (URL=='my/feed')g_status='feed';
		if (URL=='users' || URL.indexOf('users/main')===0) {
			g_status='userlist';
			listenOnOptions(ParseUserList);
		}
	}
	document.body.a('div',0,{id:'toster-comfort-sign'}).style.display = 'none';
});

const css_right_hide = '.column_sidebar { visibility: hidden; }';
if (fixFirefox) addCustomCSS(css_right_hide);

const css_global = `
.dot_sub {
	height: 14px;
	width: 14px;
	background-color: #44f;
	border-radius: 50%;
	display: inline-block;
}
.dot_sb {
	height: 14px;
	width: 14px;
	background-color: #aaf;
	border-radius: 50%;
	display: inline-block;
}
.norma {
	font-size:13px;
	font-weight:normal;
}
.tc_new {
	color: red;
	font-weight: bold;
	background-color: #ff0;
}
.online_box{
	padding-top:4px;
}

.comfortTooltip {
	position: fixed;
	padding: 10px 20px;
	border: 1px solid #b3c9ce;
	border-radius: 10px;
	font: italic 14px/1.3 sans-serif;
	color: #000;
	background: #ebffcc;
	white-space: pre-wrap;
	max-width: 400px;
	z-index: 999999;
	box-shadow: 3px 3px 3px rgba(0, 0, 0, .3);
}

.comfortLines {
	position: absolute;
	z-index: 999998;
	pointer-events: none;
}

#TMpanel {
	display: none;
}

`;

function sandbox(fn) {
	try { return fn(); } catch(e) {
		log('Ошибка в функции: ',fn.name);
		log(e);
	}
}

checkPoint('script done');
let fn_test = e=>{ //debug
	checkPoint('debug');
	if (sel('div#dfp_target')) log('Found!!!',sel('div#dfp_target').innerHTML.length);
};
let test1 = 0;
let timer1;// = setInterval(fn_test,5);

//Go online

function checkOnlineUsers() {
	return; //Эксперимент не удался. Функция не должна работать.
}
function voteOnline(act) {
	return; //Эксперимент не удался. Функция не должна работать.
}

let cached_user_tags = {}

//Анализ тегов пользователя (по требованию)
function addTagsGraph(el,nick) {
	let timer;
	let cnt = 0;
	const max_count = 150; //30 seconds
	function checkUser() {
		function drawGraph(data) {
			if(!data)return;
			cached_user_tags[nick]=data;
			if (data.cnt === 0) {
				el.a('br');
				el.a('span').a('b','Нет интересов.');
			} else {
				el.a('br');
				el.a('span').a('b','Интересы:');
				//tags
				for(let i=0;i<data.cnt;i++) {
					let t = data.tags[i];
					el.a('br');
					el.a('span',t.name + ' ('+t.honor+')').style.color = '#a98ae7';
				}
			}
			//graph
			function addCanvas(max) {
				//el.a('br');
				const HEIGHT = 100;
				let ctx = el.a('canvas', 0, {width:'350px',height:HEIGHT+'px'}).getContext('2d');
				const FLOOR = HEIGHT - 10;
				const LEVEL = FLOOR - 10;
				const MAX_VALUE = data.tags[0].honor;
				function getY(honor) {
					return Math.round(FLOOR - LEVEL * (honor / MAX_VALUE));
				}
				let LEFT = 10;
				const WIDTH = -LEFT + (350-10);
				const DELTA = WIDTH / max;
				//ctx.beginPath();
				//Координатная сетка
				ctx.beginPath();
				ctx.strokeStyle = 'rgb(150, 150, 150)';
				ctx.lineWidth = 1;
				ctx.moveTo(LEFT + 0.5, FLOOR - LEVEL - 5);
				ctx.lineTo(LEFT + 0.5, FLOOR - 0.5);
				ctx.lineTo(LEFT + WIDTH + 5, FLOOR - 0.5);
				ctx.stroke();
				ctx.font = '10px Arial';
				//Сам график
				ctx.beginPath();
				ctx.strokeStyle = 'rgb(200, 0, 200)';
				ctx.lineWidth = 3;
				ctx.moveTo(LEFT, FLOOR - LEVEL);
				for(let i =1;i<=max;i++) {
					//log(i,data.tags,data.tags[i])
					ctx.lineTo(LEFT + Math.floor(DELTA * i), getY(data.tags[i].honor));
					if (i==5) {
						ctx.stroke();
						ctx.beginPath();
						ctx.strokeStyle = 'rgb(250, 150, 250)';
						ctx.moveTo(LEFT + Math.floor(DELTA * i), getY(data.tags[i].honor));
					}
				}
				ctx.stroke();
				ctx.strokeStyle = 'rgb(160, 160, 160)';
				ctx.lineWidth = 0.5;
				ctx.fillStyle = 'rgb(200, 0, 200)';
				let LAST_GREEN_X;
				let cc = []; //Координаты точек
				for(let i =0;i<=max;i++) {
					let cx = LEFT + Math.floor(DELTA * i);
					let cy = getY(data.tags[i].honor);
					cc[i] = {x:cx,y:cy};
					if (!LAST_GREEN_X && data.tags[i].honor < 100) {
						LAST_GREEN_X = cx - 7;
						if (i>0) LAST_GREEN_X = LEFT + Math.floor(DELTA * (i-1) - DELTA * 0.5);
					}
					if(i>0) {
						ctx.beginPath();
						ctx.moveTo(cx + 0.5, FLOOR + 3);
						ctx.lineTo(cx + 0.5, Math.max(10, cy - 25));
						ctx.stroke();
					}
					ctx.fillRect(cx-3, cy-3, 6, 6);
					if (i==5) ctx.fillStyle = 'rgb(250, 150, 250)';
				}
				//Зеленая линия
				if (MAX_VALUE > 100) {
					if (!LAST_GREEN_X) LAST_GREEN_X = LEFT + WIDTH - 5;
					else if (LAST_GREEN_X < LEFT + 10) LAST_GREEN_X = LEFT + 10;
					else if (LAST_GREEN_X > 340) LAST_GREEN_X = 340;
					const GREEN_LINE_Y = FLOOR - (100 / MAX_VALUE) * LEVEL
					ctx.strokeStyle = 'rgb(0, 255, 0)';
					ctx.lineWidth = 0.5;
					ctx.beginPath();
					ctx.moveTo(LEFT + 5, GREEN_LINE_Y);
					ctx.lineTo(LAST_GREEN_X, GREEN_LINE_Y);
					ctx.stroke();
					ctx.font = '8px Arial';
					ctx.fillStyle = 'rgb(0, 128, 0)';
					ctx.fillText('100', 0, GREEN_LINE_Y);
				}
				//Подписи
				ctx.font = '10px Arial';
				ctx.fillStyle = 'rgb(0, 0, 0)';
				let px = new Array(HEIGHT).fill(0);
				function checkSpace(cx,cy,w,n) { //проверяет, есть ли место для текста
					if (cy < 7 || cy > HEIGHT -1) return false;
					if (n < max) { 
						let dy = ((cc[n+1].y - cc[n].y) / DELTA) * 4;
						if (cc[n].y + dy - 2 < cy && cc[n].y + dy + 2 > cy - 8) return false;
					}
					let min = Math.max(cy-8,0);
					for (let y=cy;y>=min;y--) {
						if (px[y] > cx) return false;
					}
					for (let i=n+1;i<max;i++) {
						if (cc[i].x + 3 > cx + w) return true;
						if (cc[i].y - 3 < cy && cc[i].y + 3 > cy - 8) return false;
					}
					return true;
				}
				for(let i =0;i<=max;i++) {
					let cx = cc[i].x+3;
					let cy = cc[i].y;
					let text = data.tags[i].name;
					let w = ctx.measureText(text).width;
					if (cx + w > 350) continue;
					let y = 0;
					while (!checkSpace(cx,cy+y,w,i)) {
						if (y>15) {
							y=-100;
							break;
						}
						if (checkSpace(cx,cy-y,w,i)) {
							y = -y;
							break;
						}
						y++;
					}
					if (y === -100) continue;
					ctx.fillText(text, cx, cy + y);
					for(let yy=Math.max(0,cy+y-8); yy < cy+y; yy++) {
						if (yy>=0) px[yy] = cx + w;
					}
					//ctx.fillRect(0, cy+y, cx + w, 8);
				}
				//log(px)
			}
			let max = Math.min(data.tags.length-1, 5);
			if (data.tags.length > 3 || data.tags.length > data.cnt) { //small graph
				addCanvas(max);
			}
			if (data.tags.length > 6 && max / data.tags.length < 0.7) { //big graph
				addCanvas(data.tags.length - 1);
			}
		}
		if (cached_user_tags[nick]) {
			cnt = max_count;
			if (timer) clearInterval(timer);
			drawGraph(cached_user_tags[nick]);
			return;
		}
		chrome.runtime.sendMessage({
			type: "analyzeUserTags",
			nickname: nick,
		}, function(data) {
			function checkData() {
				if (!el.parentNode) return; //already hidden
				if (cached_user_tags[nick]) return; //already drawn
				if (data.cnt === -1) return false; //waiting
				return data;
			} //log('check',checkData())
			if (checkData() !== false) {
				if (timer) clearInterval(timer);
				if (data.cnt >= 0) drawGraph(data);
			} else cnt++;
			if (cnt >= max_count && timer) clearInterval(timer);
		});
	}
	checkUser();
	if (cnt < max_count) timer = setInterval(checkUser,200);
}


//Всплывающая подсказка
let saveTooltip;
d.addEventListener("mouseover", e=>{
	let t = e.target;
	let tooltipHtml = t.getAttribute('data-psycho');
	if (!tooltipHtml) return;

	saveTooltip = c('div');
	saveTooltip.className = 'comfortTooltip';
	if (tooltipHtml[0] == ' ') saveTooltip.style.backgroundColor = '#dc825a';
	else if (tooltipHtml[0] == '#') {
		tooltipHtml = tooltipHtml.substr(1);
		saveTooltip.style.backgroundColor = '#ddeeff';
	}
	saveTooltip.innerText = tooltipHtml;
	d.body.a(saveTooltip);
	if (OPTIONS.psycho_tags) {
		let nickname = t.getAttribute('data-user');
		if (nickname) {
			addTagsGraph(saveTooltip,nickname);
		}
	}

	let coords = t.getBoundingClientRect();

	let left = coords.left + 50; // + 150 + (t.offsetWidth - saveTooltip.offsetWidth) / 2;
	if (left < 0) left = 0; 

	let top = coords.top - saveTooltip.offsetHeight - 3;
	if (top < 0) top = coords.top + t.offsetHeight + 3;
	
	if (top + saveTooltip.offsetHeight > window.innerHeight) { // Даже внизу не влезает, надо смещать вправо, там есть место.
		left = coords.right + 3;
		top = 3;
	}

	saveTooltip.style.left = left + 'px';
	saveTooltip.style.top = top + 'px';
});

d.addEventListener("mouseout", e=>{
	if (saveTooltip) {
		saveTooltip.remove();
		saveTooltip = null;
	}
});



