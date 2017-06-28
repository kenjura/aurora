var _ = require('lodash');
var WikiImage = require('./WikiImage.js');

var instance = {}, imageroot = '';

_.mixin({
	stringRepeat:function(chr,count) {
		var ret = '';
		for (var i = 0; i < count; i++) {
			ret += chr;
		}
		return ret;
	},
	getMatches: function(string, regex, index) {
	    index || (index = 1); // default to the first capturing group
	    var matches = [];
	    var match;
	    while (match = regex.exec(string)) {
	        matches.push(match[index]);
	    }
	    return matches;
	}

});

var linkbase,article;


function wikiToHtml(wikitext,articleName,args) {
	if (!args) args = { db:'noDB', noSection:true, noTOC:true };
	if (!wikitext) return 'nothing to render';

	linkbase = '/'+args.db+'/';
	imageroot = '/'+args.db+'/img/';

	const allArticles = args.allArticles || [];

	// console.log('wikitext=',wikitext);
	var html = String(wikitext);
	// instance.article = article;

	// convenience features
	// 1 - add title if none present
	if ( !args.noH1 && !articleName.match(/^_(menu|style)/) && !html.match( /^=([^=\n]+)=/ ) && !html.match( /^__NOH1__/ ) ) html = '='+(articleName.replace(/^_/,''))+'=\n' + html;
	html = html.replace( /__NOH1__/g , '' );

	// basic formatting ------------------------------------------
	// nowiki
	html = html.replace( /<nowiki>([\d\D]*?)<\/nowiki>/g , processNoWiki );
	html = html.replace( /^ ([^\n]*)$/mg , processCodeBlock );
	html = html.replace( /<\/?[A-Za-z][^>]*>/g , processHTML );
	//html = html.replace( /{(?!\|)([^\|]+\|)?([^}]*)}/g , processJSON );
	// headers
	html = html.replace( /^===([^=\n]+)===/mg , '<h3>$1</h3>' );
	html = html.replace( /^==([^=\n]+)==/mg , '<h2>$1</h2>' );
	html = html.replace( /^=([^=\n]+)=/mg , '<h1>$1</h1>' );

	// bullets
	html = html.replace( /(\n|^)#([\d\D]*?)(\n(?!#)|$)/g , processNumberedLists );
	html = html.replace( /(\n|^)\*([\d\D]*?)(\n(?!\*)|$)/g , processBullets );


	// dd/dt
	html = html.replace( /^;([^:\n]*)\n?(?::(.*))?/gm , '<dl><dt>$1</dt><dd>$2</dd></dl>' );
	html = html.replace( /^:(.*)/m, '<dd>$1</dd>\n' );
	// hr
	html = html.replace( /---/g , '<hr>' );
	// inline
	html = html.replace( /'''''([^']+)'''''/g , '<b><i>$1</i></b>' );
	html = html.replace( /'''([^']+)'''/g , '<b>$1</b>' );
	html = html.replace( /''([^']+)''/g , '<i>$1</i>' );
	// html = html.replace( /''(.*?)''/g , '<i>$1</i>' );
	// strikethrough
	// html = html.replace( /--(.*?)--/g , '<strike>$1</strike>' );
	// embiggen
	html = html.replace( /\+\+\+([^\+]+)\+\+\+/g , '<span style="font-size: 200%;">$1</span>' );
	html = html.replace( /\+\+([^\+]+)\+\+/g , '<span style="font-size: 150%;">$1</span>' );
	// tables
	html = html.replace( /\{\|([\d\D]*?)\|\}/g , processTable );
	// div/indent
	html = html.replace( /^\.\.\.(.*)$/mg , '<div class="indent2">$1</div>' );
	html = html.replace( /^\.\.(.*)$/mg , '<div class="indent1">$1</div>' );
	html = html.replace( /^\.(.*)$/mg , '<div>$1</div>' );
	// links
	html = html.replace( /\[\[([^\[\]\|#]*)(?:(\|[^\]\|#]*)+)?(?:#([^\]\|#]*))?\]\]/g , processLink );
	html = html.replace( /\[\[([^\[\]\|#\n]*)((\|[^\]\|#\n]*)+)?(?:#([^\]\|#\n]*))?\]\]/g , processLink );
	html = html.replace( /\[([^\]\n ]*)(?: ([^\]\n]+))?\]/g , processExternalLink );

	// code
	// html = html.replace( /^ (.*)$/mg , '<code>$1</code>' );
	// paragraphs
	html = html.trim();
	// html = html.replace( /^.*$/gm , processParagraphs );
	html = html.replace( /^[^\$\n].*$/gm , processParagraphs );
	html = html.replace( /<p><\/p>/g , '' );
	// beautify HTML
	//html = beautifyHTML(html);

	// superscript
	html = html.replace( /\^([^\^]*)\^/g , '<sup>$1</sup>' );

	// restore nowiki blocks
	html = html.replace( /\$NOWIKI_(\d*)\$/g , processNoWikiRestore );
	html = html.replace( /\$CODE_(\d*)\$/g , processCodeBlockRestore );
	html = html.replace( /<\/code>\s*<code>/g , '\n' );
	html = html.replace( /\$HTML_(\d*)\$/g , processHTMLRestore );
	//html = html.replace( /\$JSON_(\d*)\$/g , processJSONRestore );

	// WORKING CODE for sectioning h1 and h2
	if (!args.noSection) {
		var find = /(?:<h1>)([^\|<]*)(?:\|([^<\|]*))?(?:\|([^<]*))?(?:<\/h1>)([\d\D]*?)(?=<h1|$)/g;
		var replace = '\
			<div class="sectionOuter sectionOuter1 $2" style="$3">\
				<h1>$1</h1>\
				<a name="$1"></a>\
				<div class="section section1">\
					$4\
					<!--SECTION-END-->\
					<!--<div style="clear: both;"></div>-->\
				</div>\
			</div>';
		var sidebarHtml = '';
		// html = html.replace( find , replace );
		html = html.replace( find , function(em,title,args,style,body){
			if (args=='right') {
				sidebarHtml += em.replace(find,'<aside class="sidebarSection">$4</aside>');
				return em.replace(find,'<aside class="right sidebarSection">$4</aside>');
			}
			return em.replace(find,replace);
		});

		var find = /(?:<h2>)([^\|<]*)(?:\|([^<\|]*))?(?:\|([^<]*))?(?:<\/h2>)([\d\D]*?)(?=<h2|<\!--SECTION-END|$)/g;
	    	var replace = '\
	    		<div class="sectionOuter2 $2">\
	    			<h2>$1</h2>\
					<a id="$1" name="$1"></a>\
	    			<div class="section2">\
	    				$4\
						<!--<div style="clear: both;"></div>-->\
	    			</div>\
	    		</div>';
		html = html.replace( find , replace );
	}

	// adding IDs to headers for TOC seeks
	if (!args.noTOC) {
		var find = /(?:<h(\d)>)([^<]*)(?:<\/h\1>)/g;
		var replace = '<h$1 id="$2">$2</h$1>';
		html = html.replace( find, function(em,g1,g2){
			var id = g2.replace( /\s/g, '_' );
			return '<h'+g1+' id="'+id+'">'+g2+'</h'+g1+'>';
		});
	}
		// toc html
		if (args.toc) return html;
		var tocHtml = getTOC(wikitext);

	// return html;
	return { html:html, sidebarHtml:sidebarHtml, wikitext:wikitext, tocHtml:tocHtml };


	function getTOC(wikitext) {
		if (!wikitext) return '';
		var headerRows = wikitext.match( /^=.*/mg );
		if (!headerRows||!headerRows.length) return '';
		headerRows = headerRows.filter(hr=>hr.indexOf('|right')<0);
		var headers = headerRows.join('\n');
		headers = headers.replace( /\[\[/g , '' );
		headers = headers.replace( /\]\]/g , '' );
		headers = headers.replace( /^===([^=|]*)(.*)$/mg , '*** $1' );
		headers = headers.replace( /^==([^=|]*)(.*)$/mg , '** $1' );
		headers = headers.replace( /^=([^=|]*)(.*)$/mg , '* $1' );
		headers = headers.replace( /=([^=|]*)/g , '$1' );
		headers = headers.replace( /\* (.*)$/mg , '* [[#$1]]' );
		return wikiToHtml(headers,'toc',{toc:true, noSection:true, noH1:true});;
	}

	function processLink(entireMatch,articleName,displayName,anchor) {
		var namespace = [].concat(articleName.match( /([^:]+)(?=:)/g )).pop();
		if (namespace) var res = processSpecialLink(entireMatch,namespace,articleName,displayName);
		if (res) return res;
		if (!anchor) anchor = '';

		if (articleName.match(/^(\d+d\d+)([+-]\d+)/)) return '<a onclick="roll(\''+articleName+'\')">'+articleName+'</a>';
		if (articleName.match(/^[+-]/)) return '<a onclick="roll('+articleName+')">'+articleName+'</a>';

		// if (isNullOrEmpty(articleName)) return '<a href="#'+anchor+'" onclick="instance.findHeader(\''+anchor+'\')">'+anchor+'</a>';
		if (!articleName) return '<a data-scroll href="#'+anchor.replace( /\s/g, '_' )+'">'+anchor+'</a>';

		if (!displayName) displayName = anchor || articleName;
		else if (displayName.substr(0,1)=='|') displayName = displayName.substr(1);

		if (!anchor) anchor = ''; else anchor = '#'+anchor;

		var active = true;

		active = _.some(allArticles,function(a){ return a==articleName });

		var link = linkbase+articleName+anchor;

		if (articleName.indexOf('/')>-1) {
			link = '/'+articleName+anchor;
			displayName = articleName.substr(articleName.indexOf('/')+1);
			console.log('link=',link);
		}

		return '<a class="wikiLink '+(active?'active':'inactive')+'" data-articleName="'+articleName+'" href="'+link+'">'+displayName+'</a>';
	};

	function processNumberedLists(entireMatch) {
		var lines = entireMatch.match( /^(.*)$/gm );
		var level = 1;
		var html = '\n<ol>';
		for (var i = 0; i < lines.length; i++) {
			var line = lines[i];
			if (line.substr(0,1)!='#') continue;
			var lineLevel = line.match( /#+/ )[0].length;
			if (lineLevel > level) html += _.stringRepeat('<ol>',lineLevel-level);
			if (lineLevel < level) html += _.stringRepeat('</li></ol>',level-lineLevel);
			if (lineLevel == level && html != '\n<ol>') html += '</li>';
			level = lineLevel;
			//html += '\n'+_.stringRepeat('\t',lineLevel);
			html += '<li>'+line.replace( /#+/ , '');
		}

		if (level > 1) html += _.stringRepeat('</li></ol>',level);
		html += '</li></ol>\n';
		return html;
	};

	function processBullets(entireMatch) {
		var lines = entireMatch.match( /^(.*)$/gm );
		var level = 1;
		var html = '\n<ul>';
		for (var i = 0; i < lines.length; i++) {
			var line = lines[i];
			if (line.substr(0,1)!='*') continue;
			var lineLevel = line.match( /\*+/ )[0].length;
			if (lineLevel > level) html += _.stringRepeat('<ul>',lineLevel-level);
			if (lineLevel < level) html += _.stringRepeat('</li></ul>',level-lineLevel);
			if (lineLevel == level && html != '\n<ul>') html += '</li>';
			level = lineLevel;
			//html += '\n'+_.stringRepeat('\t',lineLevel);
			html += '<li>'+line.replace( /\*+/ , '');
		}

		if (level > 1) html += _.stringRepeat('</li></ul>',level);
		html += '</li></ul>\n';
		return html;
	};
	function processExternalLink(entireMatch,url,displayName) {
		if (!(displayName)) displayName = url;
		return '<a href="'+url+'">'+displayName+'</a>';
	};
	function processSpecialLink(entireMatch,namespace,articleName,displayName) {
		var args = [];
		if (!(displayName)) displayName = '';
		else {
			args = _.getMatches( entireMatch, /\|([^\|\]]+)/g, 0 );
			// var str = [].concat(entireMatch.match( /\[\[([^\]]+)\]\]/ )).pop();
			// if (str) args = str.split('|');
		}

		articleName = articleName.replace( namespace+':' , '' );

		function getArg(index) {
			if (args.length >= index) return args[index];
			else return '';
		}

		switch (namespace.toUpperCase()) {
			case 'IFRAME': return '<iframe src="'+articleName+'"'+getArg(0)+'></iframe>';
			case 'IMAGE': return WikiImage.getImageTag({name:articleName,args:args,imgUrl:imageroot+articleName});
			default:
				return null;
		}
	};

	function processJSON(entireMatch,options,tag) {
		if (!instance._JSONTags) instance._JSONTags = [];
		instance._JSONTags.push( new JSONTag({options:options,body:'{'+tag+'}'}) );
		return '$JSON_'+(instance._JSONTags.length-1)+'$';
	};
	function processJSONRestore(entireMatch,arrayIndex) {
		var tag = instance._JSONTags[parseInt(arrayIndex)];
		return 'JSON tag: '+tag.render();
	};
	function processHTML(entireMatch) {
		if (!instance._htmlTags) instance._htmlTags = [];
		instance._htmlTags.push(entireMatch);
		return '$HTML_'+(instance._htmlTags.length-1)+'$';
	};
	function processHTMLRestore(entireMatch,arrayIndex) {
		return instance._htmlTags[parseInt(arrayIndex)];
	};
	function processNoWiki(entireMatch,wikiText) {
		if (!instance._noWiki) instance._noWiki = [];
		instance._noWiki.push(wikiText);
		return '$NOWIKI_'+(instance._noWiki.length-1)+'$';
	};
	function processNoWikiRestore(entireMatch,arrayIndex) {
		return instance._noWiki[parseInt(arrayIndex)];
	};
	function processCodeBlock(entireMatch,wikiText) {
		if (!instance._CodeBlock) instance._CodeBlock = [];
		instance._CodeBlock.push(wikiText);
		return '$CODE_'+(instance._CodeBlock.length-1)+'$';
	};
	function processCodeBlockRestore(entireMatch,arrayIndex) {
		return '<code>'+instance._CodeBlock[parseInt(arrayIndex)]+'</code>';
	};
	function processParagraphs(entireMatch) {
		if (entireMatch.substr(0,1)=='<') return entireMatch; // html? looks like it's already been converted, let's leave it alone
		if (entireMatch.indexOf('$HTML')>-1) return entireMatch;

		return '<p>'+entireMatch+'</p>';
	};

	function processTable(entireMatch,tableBody) {

		// ***************** LEX ***************
		// protect pipe characters inside a table that have nothing to do with cell boundaries
		entireMatch = entireMatch.replace( /\[\[[^\]\n]+\]\]/g , function(em) {
			return em.replace( /\|/g , '$BAR$' );
		});

		// table boundaries
		entireMatch = entireMatch.replace( /\{\|(?:([^>\n]*)>)?/g , '¦TABLE¦$1¦' );
		entireMatch = entireMatch.replace( /\|\}/g , '¦END TABLE¦' );

		// table rows
		entireMatch = entireMatch.replace( /^\|-/mg , '¦ROW BOUNDARY¦' );

		// table headers

		// note 2013-04-02: tweaked TH regex to allow ! characters inside TD cells. Basically, a single ! is only a "start TH" if it is preceded by a newline.
		// note 2014-06-19: swapped out $ for \n inside the TH/TD optional HTML attributes section. In a character class, $ doesn't mean "end of line", it's always literal. For some reason.

		//entireMatch = entireMatch.replace( /!{1,2}(?:([^$>\|!]+)>|([0-9]+)\|)?([^!\|¦]+)(?=\n!|!!|\n\||\|\||¦)/gm , function(wholeMatch,m0,m1,m2,m3,m4,m5) {
		entireMatch = entireMatch.replace( /(?:^!|!!)(?:([^\n>\|!]+)>|([0-9]+)\|)?([^!\|¦]+)(?=\n!|!!|\n\||\|\||¦)/gm , function(wholeMatch,m0,m1,m2,m3,m4,m5) {
			m0 = m0 || '';
			m2 = m2 || '';
			if (m1!=''&&typeof(m1)!='undefined') return '¦TH¦colspan="'+m1+'" '+m0+'¦'+m2+'¦END TH¦';
			else return '¦TH¦'+m0+'¦'+m2+'¦END TH¦';
			// m0 = !m0>
			// m1 = !m1| aka colspan
			// m2 = actual cell content
		} );
		//return entireMatch;
		entireMatch = entireMatch.replace( /\|{1,2}(?:([^\n>\|!]+)>|([0-9]+)\|)?([^\|¦]+)(?=\n!|!!|\n\||\|\||¦)/gm , function(wholeMatch,m0,m1,m2,m3) {
			m0 = m0 || '';
			m2 = m2 || '';
			if (m1!=''&&typeof(m1)!='undefined') return '¦TD¦colspan="'+m1+'" '+m0+'¦'+m2+'¦END TD¦';
			else return '¦TD¦'+m0+'¦'+m2+'¦END TD¦';
		} );


		// ***************** FINAL ******************
		entireMatch = entireMatch.replace( /¦TABLE¦([^¦]*)¦/g , "<div class=\"tableContainer\"><table $1><tr>" );
		entireMatch = entireMatch.replace( /¦END TABLE¦/g , "</tr></table></div>" );

		entireMatch = entireMatch.replace( /¦ROW BOUNDARY¦/g , "</tr><tr>" );

		entireMatch = entireMatch.replace( /¦TH¦([^¦]*)¦([^¦]*)¦END TH¦/g , "<th $1>$2</th>" );
		entireMatch = entireMatch.replace( /¦TD¦([^¦]*)¦([^¦]*)¦END TD¦/g , function(wholeMatch,m0,m1,m2) {
			return '<td '+(m0||'')+'>\n'+(m1||'')+'\n</td>';
		});

		entireMatch = entireMatch.replace( /\$BAR\$/g , '|' );

		// **************** RETURN *****************
		return entireMatch;
	};

	function findHeader(name) {
		smoothScroll.animateScroll( null, '#'+name );
		// var headers = document.querySelectorAll('h1,h2,h3');
		// for (var i = 0; i < headers.length; i++) {
		// 	if (headers[i].innerHTML.trim()==name) {
		// 		var y = UIUtil.getPageOffset(headers[i]).y;
		// 		UIUtil.animate( document.body, 300, { scrollTop: y});
		// 		// document.body.scrollTop = y;
		// 		return;
		// 	}
		// }
	}


}


exports.wikiToHtml = wikiToHtml;
