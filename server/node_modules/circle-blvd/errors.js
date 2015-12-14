// errors.js

module.exports = function () {

	var logError = function (err) {
		console.log(err);
	};

	var handleError = function (err, res) {
		var message = err.message || "Internal server error";
		var status = err.status || 500;
		logError(err);
		res.status(status).send(message);
	};

	// Useful for guarding callbacks. For example,
	// say we have:
	//
	// db.circles.getAll(function (err, circles) {
	//     if (err) {
	//	       handleError(err, res);
	//     }
	//     <deal with circles>
	// });
	//
	// We can use 'guard' to do this instead:
	// 
	// db.circles.getAll(guard(res, function (circles) {
    //     <deal with circles>
	// }));
	//
	var guard = function (res, callback) {
		var fn = function (err, data) {
			if (err) {
				return handleError(err, res);
			}
			callback(data);
		};
		return fn;
	};

	return {
		log: logError,
		handle: handleError,
		guard: guard
	};
}();