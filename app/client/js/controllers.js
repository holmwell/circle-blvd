'use strict';

/* Controllers */


function LoginCtrl($scope, $location) {
	
	$scope.login = function() {
		$location.path('/view2');
	};
}
LoginCtrl.$inject = ['$scope', '$location'];


function ConfigCtrl($scope) {

	$scope.config = function() {
		// TODO: Save admin username.
	};
}
ConfigCtrl.$inject = ['$scope'];
