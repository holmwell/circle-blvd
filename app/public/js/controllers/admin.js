'use strict';

function AdminCtrl(session, $scope, $http) {

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

	$scope.removeUser = function (user) {
		var data = user;

		$http.put('/data/users/remove', data)
		.success(function() {
			getLatestUserData();
		})
		.error(function (data) {
			console.log(data);
		});
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
		if (status === 401 && $scope.isSignedIn()) {
			// && is admin ...
			$scope.signOut();
			console.log("The server was restarted. Please log in again.");
		}
	};

	var getLatestUserData = function() {
		$http.get('/data/users')
		.success(getUsersSuccess)
		.error(getUsersFailure);
	};

	getLatestUserData();
}
AdminCtrl.$inject = ['session', '$scope', '$http'];
