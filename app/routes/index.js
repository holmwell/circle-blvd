
exports.index = function(req, res){
	var params = {
		host: req.get('Host')
	};
	res.render('index', params);
};