'use strict';

/* Controllers */


function LoginCtrl($scope, $location, $http) {
	
	$scope.login = function() {
		// var user = $scope.user.email;
		// var pass = $scope.user.password;

		var res = $http.post('/login', $scope.user);
	};
}
LoginCtrl.$inject = ['$scope', '$location'];


function ConfigCtrl($scope) {

	$scope.config = function() {
		// TODO: Save admin username.
	};
}
ConfigCtrl.$inject = ['$scope'];
