'use strict';

/* Controllers */
function HomeCtrl($scope) {

}
HomeCtrl.$inject = ['$scope'];


function InitializeCtrl($scope, $location, $http) {

	$scope.initialize = function() {
		$scope.user.name = "Administrator";

		// TODO: This code is duplicated here because I don't know
		// "the right way" to share code among controlllers in 
		// Angular, yet. Well, ok, we probably need to make
		// a service.
		var login = function (user, success, failure) {
			var xsrf = $.param(user);
			var request = {
				method: 'POST',
				url: '/auth/signin',
				data: xsrf,
				headers: {'Content-Type': 'application/x-www-form-urlencoded'}
			};		

			$http(request).success(success).error(failure);
		};

		var initializeSuccess = function(data, status, headers, config) {
			// After initialization is a success, log in.
			var loginSuccess = function(data, status, headers, config) {
				$location.path('/');
			};

			var loginFailure = function(data, status, headers, config) {
				// TODO: Display error.
				console.log("Failure to log in after initialization.");
			};

			login($scope.user, loginSuccess, loginFailure);
		};

		var initializeFailure = function(data, status, headers, config) {
			// TODO: Display error.
			console.log("Failure to initialize");
			console.log(JSON.stringify(data));
		};

		$http.put('/data/initialize', $scope.user)
		.success(initializeSuccess)
		.error(initializeFailure);
	};
}
InitializeCtrl.$inject = ['$scope', '$location', '$http'];


