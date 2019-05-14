let back = chrome.extension.getBackgroundPage(),d=document;



d.addEventListener('DOMContentLoaded', function () {
	const len = back.localStorage.db? back.localStorage.db.length:0;
	const perc = Math.round(len / 5000000 * 1000)/10;
	let info1 = d.body.appendChild(d.createElement('span'));
	info1.innerText	= 'Кэш занимает: '+perc+'%';
	d.body.appendChild(d.createElement('br'));
	let info2 = d.body.appendChild(d.createElement('a'));
	info2.innerText = 'Настройки';
	info2.href = '#';
	info2.addEventListener('click',e=>{
		window.open(chrome.runtime.getURL('options.html'),'_blank');
		e.preventDefault();
	});
});







