function createTOC(minHeaders=3) {
	let toc = $('#toc'), headers = $('h2,h3,h4,h5,h6');
	if (toc.length == 0) {
		// Insert new TOC before first header
		toc = $('<div>', {id:'toc'});
		toc.insertBefore(headers.eq(0));
	}
	if (headers.length >= minHeaders || toc.hasClass('force')) {
		toc.empty();
		toc.append($('<div>', {id:'tocheader', text:'Contents'}));
		let itemStack = [toc], listStack = [];
		headers.each(function(){
			// Find nearest parent item
			let lvl = parseInt(this.tagName[1])-1;
			let parent = lvl - 1;
			while (!itemStack[parent]) {
				parent--;
			}
			if (!listStack[parent]) {
				// Add child list to parent item
				listStack[parent] = $('<ol>').appendTo(itemStack[parent]);
			}
			// Create item for current header
			let item = $('<li>');
			item.append($('<a>', {href:'#'+this.id, text:this.innerText}));
			listStack[parent].append(item);
			// Replace stack tail with new item
			itemStack.splice(lvl, itemStack.length-lvl, item);
			listStack.splice(lvl, listStack.length-lvl);
		});
	} else {
		toc.addClass('empty');
	}
	return toc;
}
/*Test headers:
$('section').append(
	'<h2 id="h2_1">H2</h2>',
	'<h3 id="h3_1">H3</h3>',
	'<h3 id="h3_2">H3</h3>',
	'<h2 id="h2_2">H2</h2>',
	'<h4 id="h4_1">H4</h4>',
	'<h3 id="h3_3">H3</h3>',
	'<h4 id="h4_2">H4</h4>',
	'<h2 id="h2_3">H2</h2>'
);*/
createTOC();