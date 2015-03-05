var fs = require('fs');
var path = require('path');
var version = "0.0.0";

var packagePath = path.join(__dirname, "..", "package.json");
fs.readFile(packagePath, "utf-8", readPackageJson);

function readPackageJson(err, data) {
	if (err) {
		console.log("index: Could not read package.json at: " + packagePath);
		return;
	}
	var packageJson = JSON.parse(data);
	version = packageJson.version;
}

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
	var urls = ['/signin', '/about', '/docs', '/sponsor', '/donate'];

	var response = "";
	urls.forEach(function (url) {
		response += prefix + url + '\n';
	});

	res.type('text/plain');
	res.send(200, response);
};