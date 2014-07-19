// errors.js

module.exports = function () {

	var logError = function (err) {
		console.log(err);
	};

	var handleError = function (err, res) {
		var message = err.message || "Internal server error";
		var status = err.status || 500;
		logError(err);
		res.send(status, message);
	};

	return {
		log: logError,
		handle: handleError
	};
}();