'use strict';

/* Controllers */
function InitializeCtrl($scope, $window, $http) {

	$scope.error = {};

	$scope.initialize = function (messageLocation) {
		if (!$scope.user) {
			$scope.error.type = "alert-info";
			$scope.error[messageLocation] = "Yeah, so, please enter in some login credentials.";
			return;
		}

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
				// Refresh the page. The server will take
				// care of the rest.
				$window.location.href = "/";
			};

			var loginFailure = function(data, status, headers, config) {
				// TODO: Display error.
				console.log("Failure to log in after initialization.");
			};

			login($scope.user, loginSuccess, loginFailure);
		};

		var initializeFailure = function(data, status, headers, config) {
			// TODO: Display error.
			var err = data;
			if (err.code === 1) {
				// Permanent failure.
				$scope.error.type = 'alert-danger'
				$scope.error[messageLocation] = "Sorry, the website failed to initialize. " +
				"That's odd, though. Is CouchDB running? There should be a log in the server " +
				"console that has more-technical detail.";
			}
			else if (err.code === 2) {
				// Failure of optional things.
				$scope.error.type = 'alert-warning'
				$scope.error[messageLocation] = "Sorry, the website failed to initialize completely. " +
				"Some things will work, but the optional configuration settings might not be in place.";
			}
			else {
				$scope.error.type = 'alert-info';
				$scope.error[messageLocation] = "It seems the server was shut off, or something unexpected like that.";
			}

			console.log("Failure to initialize");
			console.log(JSON.stringify(data));
		};

		var data = {};
		data.admin  = $scope.user;
		data.ssl    = $scope.ssl;
		data.smtp   = $scope.smtp;
		data.contact = $scope.contact;
		data.stripe = $scope.stripe;

		$http.put('/data/initialize', data)
		.success(initializeSuccess)
		.error(initializeFailure);
	};
}
InitializeCtrl.$inject = ['$scope', '$window', '$http'];


