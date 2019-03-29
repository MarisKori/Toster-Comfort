//Habr comfort

let OPTIONS = {};
// Change page according to options
function parse_opt(callback) {
	chrome.runtime.sendMessage({
		type: "getOptionsHabr",
	}, function(options) {
		console.log('Parse Options',options);
		//window.options = options; //doesn't work
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


document.addEventListener('DOMContentLoaded', function () {
	console.log(checkURL('news','company','post'));
	if (!checkURL('news','company','post')) return;
	parse_opt(()=>{
		if (checkURL('news','company','post') && (OPTIONS.move_posttime_down || OPTIONS.move_stats_up)) { //bug: may be a list
			let postTime = document.querySelector('.post__time');
			let postStats = document.querySelector('.post-stats_post');
			if (postTime && postStats) {
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
			
		}
	});
});


