var fs = require('fs');
var version = "0.0.0";

fs.readFile("package.json", "utf-8", readPackageJson);
function readPackageJson(err, data) {
	if (err) {
		console.log("index: Could not read package.json");
		return;
	}
	var packageJson = JSON.parse(data);
	version = packageJson.version;
}

exports.index = function renderIndex(req, res){
	var params = {
		host: req.get('Host'),
		version: version
	};
	res.render('index', params);
};