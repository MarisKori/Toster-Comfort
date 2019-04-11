//Habr comfort

let OPTIONS = {};
// Change page according to options
function parse_opt(callback) {
	chrome.runtime.sendMessage({
		type: "getOptionsHabr",
	}, function(options) {
		//console.log('Parse Options',options);
		OPTIONS = options;
		callback();
	});
}

//Проверяет совпадение текущего URL с одним из списка
function checkURL() {
	let a = [...arguments];
	for(let i=a.length;i>=0;i--) {
		if (location.href.indexOf('https://habr.com/' + a[i] + '/') > -1) return true; //old style
		if (location.href.indexOf('https://habr.com/ru/' + a[i] + '/') > -1) return true;
		if (location.href.indexOf('https://habr.com/en/' + a[i] + '/') > -1) return true;
	}
	return false;
}

//Скрывать форму для комментариев по умолчанию
function hideCommentFormByDefault() {
	let comment_text = document.querySelector('.comment-form__title-text'); //Текст "Написать комментарий" (span)
	let editor = document.querySelector('.comment-form_wrapper'); //Редактор плавает между ответами. Это один и тот же элемент всегда.
	if (!(comment_text && editor)) return console.log('TC Error: comment_text or editor no found');
	let comment_div = comment_text.parentNode;
	const CLOSED = 'comment-form__title comment-form__title_listened';
	const OPENED = 'comment-form__title';
	if (!(comment_div && comment_div.className == OPENED))
		return console.log('TC Error: comment form not found!',comment_div && comment_div.className);
	let spoiler_status = true; //true means hidden --> we will hide it below
	let remove_fn = function() { //any click --> we must show the form
		if (!spoiler_status) return;
		editor.style.display = '';
		comment_text.removeEventListener('click',onclick);
		spoiler_status = false;
	}
	let onclick = function() {
		remove_fn();
		comment_div.className = OPENED; //Если кликнули по надписи, то нужно также поменять её текст.
	}
	document.querySelectorAll('.comment__footer-link').forEach(e=>e.addEventListener('click',remove_fn));
	comment_text.addEventListener('click',onclick);
	//Меняем стиль текста-кнопки и скрываем редактор
	comment_div.className = CLOSED;
	editor.style.display = 'none';
}

//Перемещаем иинформационные элементы на странице со статьей
function moveSomeBlocks() {
	let postTime = document.querySelector('.post__time');
	let postStats = document.querySelector('.post-stats_post');
	if (!(postTime && postStats)) return console.log('TC Error: postTime or postStats not found');
	if (OPTIONS.move_stats_up) {
		let header = postTime.parentNode;
		let wrapper = header.parentNode;
		wrapper.insertBefore(postStats.cloneNode(true), header.nextSibling);
	}
	if (OPTIONS.move_posttime_down) {
		let li = document.createElement('li');
		li.className = "post-stats__item";
		li.style.paddingRight = "15px";
		li.appendChild(postTime.cloneNode(true));
		postStats.appendChild(li);
	}
}


document.addEventListener('DOMContentLoaded', function () {
	parse_opt(()=>{
		if (checkURL('news','company','post') && (OPTIONS.move_posttime_down || OPTIONS.move_stats_up)) { //bug: may be a list
			moveSomeBlocks();
		}
		if (OPTIONS.hide_comment_form_by_default) {
			hideCommentFormByDefault();
		}
		if (OPTIONS.habr_css) {
			let css = document.createElement("style");
			css.type = "text/css";
			css.innerHTML = OPTIONS.habr_css;
			document.body.appendChild(css);
		}
	});
});



