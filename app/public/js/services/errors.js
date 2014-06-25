CircleBlvd.Services.errors = function ($rootScope, $http) {

	var handleError = function (err) {
		$rootScope.$broadcast('circleblvd-error', err);
		console.log(err);
	};

	return {
		handle: handleError
	};
};
CircleBlvd.Services.errors.$inject = ['$rootScope', '$http'];