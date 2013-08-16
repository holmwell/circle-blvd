'use strict';

function AdminCtrl($scope, $http) {

	var addUserSuccess = function() {
		$scope.userName = "";
		$scope.userEmail = "";
		$scope.userPassword = "";
		
		getLatestUserData();
	};

	var addUserFailure = function() {
		console.log("Sad inside add user. :(");
	};

	$scope.addUser = function(userName, userEmail, userPassword) {
		var data = {
			name : userName,
			email : userEmail,
			password : userPassword
		};

		$http.put('/data/users/add', data)
		.success(addUserSuccess)
		.error(addUserFailure);
	};

	var getUsersSuccess = function(data, status, headers, config) {
		if (data === {}) {
			// do nothing. 
		}
		else {
			$scope.users = data;
		}
	};

	var getUsersFailure = function(data, status, headers, config) { 

	};

	var getLatestUserData = function() {
		$http.get('/data/users')
		.success(getUsersSuccess)
		.error(getUsersFailure);
	};

	getLatestUserData();
}
AdminCtrl.$inject = ['$scope', '$http'];
