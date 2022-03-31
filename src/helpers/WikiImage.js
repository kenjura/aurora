exports.getImageTag = function(args) {
	if (!args) args = {};
	if (!args.name) { console.error('WikiImage.getImage > cannot get image with no name.'); return ''; }
	// if (!args.article) { console.error('WikiImage.getImage > article not supplied.'); return ''; }
	
	// var images = args.article.images;
	// var image = null;
	// if (images) {
	// 	for (var i = 0; i < images.length; i++) {
	// 		if ( images[i].name == args.name ) {
	// 			image = images[i];
	// 			break;
	// 		}
	// 	}
	// }
	// if (!image) {
	// 	// image not yet uploaded
	// 	return '<div class="noImage" ng-click="activateImage(\''+args.name+'\')">?</div>';
	// } else {
		// path
		// var imgUrl = WikiImage.imageRoot + image.path;		
		var imgUrl = args.imgUrl;		
		// style
		var width = 'auto', height = 'auto', classes = '', caption = '', fillMode = null, float = '';
		if (args.args&&args.args.length) {
			for (var i = 0; i < args.args.length; i++) {
				var arg = args.args[i];
				// numbers = width/height. for now, let's just do width
				if (!isNaN(arg)) { 
					if (width=='auto') width = parseFloat(arg) + 'px'; 
					else height = parseFloat(arg) + 'px';
					continue; 
				}
				if (arg.substr(-1)=='%') { 
					if (width=='auto') width = arg; 
					else height = arg;
					continue; 
				}
				if (arg.substr(-2)=='px') { 
					if (width=='auto') width = arg; 
					else height = arg;
					continue; 
				}
				// string values might mean something...
				if (arg=='right') { float = 'float: right; clear: right;'; continue; }
				if (arg=='fit'||arg=='box') { classes += arg + ' '; continue; }
				if (arg=='center') { classes += 'center '; continue; }
				if (arg=='cover'||arg=='contain') { fillMode = arg; continue; }
				// else, assume it's the caption
				caption = arg;
			}
		}		
		var style = 'width: '+width+'; height: '+height+';' + float;
		
		// events		
		// var events = 'onclick="_scope.activateImage(\''+args.name+'\',\''+imgUrl+'\')"';	
		var events = 'ng-click="activateImage(\''+args.name+'\',\''+imgUrl+'\')"';
		
		//return '<img class="wikiImage" src="'+imgUrl+'" style="'+style+'" '+events+' />';

		var template = ''+
		'<a href="{src}">'+
			'<div class="wikiImage {class}" style="{style}" title="{caption}">'+
				'<img src="{src}" {events} />'+
				'<div class="wikiImage_caption">{caption}</div>'+
			'</div>'+
		'</a>';

		// var template2 = ''+
		// '<a href="{src}">'+
		// 	'<div class="wikiImage {class}" style="background: url(\'{src}\'); background-size: {fillMode}; {style}" {events}>'+
		// 		'<div class="wikiImage_caption">{caption}</div>'+
		// 	'</div>'+
		// '</a>';

		const template2 = `<span class="wiki-image-container"><img src="${imgUrl}" style="${style}" class="wikiImage wiki-image" onClick="evt => imageZoom(evt)" />`;
		return template2;


		var html = template;
		if (fillMode) html = template2;

		html = html.replace( /\{src\}/g , imgUrl );
		html = html.replace( '{class}' , classes );
		html = html.replace( '{style}' , style );
		html = html.replace( '{events}' , events );
		html = html.replace( /\{caption\}/g , caption );
		if (fillMode)
			html = html.replace( '{fillMode}' , fillMode );

		return html;
	// }
	
	/*
	var imgCache = localStorage.getItem('imageCache');
	if (!imgCache) imgCache = JSON.stringify({});
	
	try {
		imgCache = JSON.parse(imgCache);
		var imgUrl = imgCache[args.name];
		if (!imgUrl) {
			//var img = new WikiImage(args);
			var img = new WikiImage(args);
			var tag = img.render();
			imgCache[args.name] = img.url;						
		} else {
			args.url = imgUrl;			
			var img = new WikiImage(args);			
			var tag = img.render();
		}
		localStorage.setItem('imageCache',JSON.stringify(imgCache));
		return tag;
	} catch(e) {
		error('WikiImage.getImage > could not retrieve or parse the image cache. error to follow.');
		error(e);
		return new WikiImage(args);
	}
	*/

	
}




/* how images should work:
* when you load an article, you also get a list of all images used in that article, and their URLs
* when rendering an image, check that list first. if the image name isn't in that list, don't bother trying to load the image
** if it is in the list, load it, relying on browser cache to reduce load
** important: do not use the server method to find each image's url; get them all from the loadArticle call
** the FS db option should store image (and link) data in a special section at the end of the article body. it also doesn't allow images to have a different name than their url
* when an image is not yet uploaded, show a gray box with a question mark
* when the grey box or the image is clicked, pop up the image upload modal
* the image upload modal uses the appropriate service endpoint to upload, then returns the new URL
** the new URL is then cached
** the image is loaded from the URL
** the image is associated with the article, which is immediately saved with the new image association
*/