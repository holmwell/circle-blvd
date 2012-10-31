'use strict';

/* Controllers */
function HomeCtrl($scope) {

}
HomeCtrl.$inject = ['$scope'];


function LoginCtrl($scope, $location, $http) {
	
	$scope.login = function() {
		// var user = $scope.user.email;
		// var pass = $scope.user.password;

		var res = $http.post('/login', $scope.user);
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
