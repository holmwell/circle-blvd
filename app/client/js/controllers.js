'use strict';

/* Controllers */
function HomeCtrl($scope) {

}
HomeCtrl.$inject = ['$scope'];


function LoginCtrl($scope, $location, $http) {
	
	$scope.login = function() {

		var xsrf = $.param($scope.user);

		var res = $http({
			method: 'POST',
			url: '/login',
			data: xsrf,
			headers: {'Content-Type': 'application/x-www-form-urlencoded'}
		})
			.success(function(data, status, headers, config) {
				$scope.message = "Success!";
			})
			.error(function(data, status, headers, config) {
				$scope.message = "Sad. :-("
    		});
	};
}
LoginCtrl.$inject = ['$scope', '$location', '$http'];




function InitializeCtrl($scope, $http, $location) {

	$scope.initialize = function() {
		$scope.user.name = "Administrator";

		var res = $http.put('/data/initialize', $scope.user)
			.success(function(data, status, headers, config) {
				$location.path('/');
			})
			.error(function(data, status, headers, config) {
				// TODO: Display error.
    		});
	};
}
InitializeCtrl.$inject = ['$scope', '$http', '$location'];
