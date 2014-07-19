CircleBlvd.Services.errors = function ($rootScope, $http) {

	var logError = function (data, status) {
		console.log(data);
		console.log(status);
	};

	var handleError = function (data, status) {
		var err = {
			data: data,
			status: status
		};
		$rootScope.$broadcast('circleblvd-error', err);
		logError(data, status);
	};

	return {
		handle: handleError,
		log: logError
	};
};
CircleBlvd.Services.errors.$inject = ['$rootScope', '$http'];