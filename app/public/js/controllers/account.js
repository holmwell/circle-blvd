'use strict';

function AccountCtrl(session, $scope, $http) {

	var messages = {};
	$scope.user = session.user;
	$scope.messages = messages;

	$scope.updateUser = function (user) {
		$http.put('/data/user', user)
		.success(function() {
			session.user = user;
			session.save();

			messages.user = "Account updated."
		})
		.error(function (data, status) {
			console.log(data);
		})
	};

	$scope.updatePassword = function (pass1, pass2) {
		if (pass1 !== pass2) {
			messages.password = "Sorry, your passwords don't match."
			return;
		}

		var data = {};
		data.password = pass1;

		$http.put('/data/user/password', data)
		.success(function() {
			messages.password = "Password updated.";
		})
		.error(function (data) {
			console.log(data);
		});
	};

	// Get our data as a check to see if we should even be here.
	$http.get('/data/user')
	.success(function (data) {
		if (session.user.id !== data.id) {
			$scope.signOut();
			console.log("Sorry, we thought you were someone else for a second. Please sign in again.");
		}
	})
	.error(function (data, status) {
		if (status === 401 && session && session.user) {
			$scope.signOut();
			console.log("The server was restarted. Please sign in again.");			
		}
	});
}
AccountCtrl.$inject = ['session', '$scope', '$http'];