const markdown = require('markdown-it')({ html:true });

markdown.use(require('markdown-it-container'), 'aside', getAside());
markdown.use(require('markdown-it-deflist'));
markdown.use(require('markdown-it-sup'));

module.exports = { markdownToHtml }

function markdownToHtml(md) {
	return markdown.render(md);
}



function getAside() {
	return {

		validate: function(params) {
			console.log('validate', `params="${params}"`, 'match=', params.trim().match(/^aside\s+(.*)$/));
			return true;
			return params.trim().match(/^aside\s+(.*)$/);
		},

		render: function (tokens, idx) {
			var m = tokens[idx].info.trim().match(/^aside\s+(.*)$/);

			if (tokens[idx].nesting === 1) {
				// opening tag
				// return '<aside><summary>ASIDE' + m[1] + '</summary>\n';
				return '<aside>\n';

			} else {
				// closing tag
				return '</aside>\n';
			}
		}
	}
}