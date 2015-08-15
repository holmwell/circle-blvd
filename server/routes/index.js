var version = require('../lib/version');

exports.index = function renderIndex(req, res, app) {
	var analyticsId = false;
	var settings = app.get('settings');
	if (settings && settings['google-analytics']) {
		analyticsId = settings['google-analytics'].value;
	}

	var params = {
		host: req.get('Host'),
		version: version,
		analyticsId: analyticsId
	};
	res.render('index.ejs', params);
};

exports.sitemap = function renderSitemap(req, res) {
	var prefix = req.protocol + '://' + req.get('Host') + '/#';
	var urls = ['/signin', '/about', '/docs', '/partner', '/donate'];

	var response = "";
	urls.forEach(function (url) {
		response += prefix + url + '\n';
	});

	res.type('text/plain');
	res.send(200, response);
};