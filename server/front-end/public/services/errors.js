CircleBlvd.Services.errors = function ($rootScope, $http, analytics) {

	var logError = function (data, status) {
		console.log(data);
		console.log(status);
		analytics.trackError(status);
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
CircleBlvd.Services.errors.$inject = ['$rootScope', '$http', 'analytics'];

angular.module('CircleBlvd.services')
.factory('errors', CircleBlvd.Services.errors);