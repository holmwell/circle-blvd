'use strict';

function ProfileCtrl(session, $scope, $http) {

	var messages = {};
	if (session.user) {
		$scope.name = session.user.name;
		$scope.email = session.user.email;
		if (session.user.notifications && session.user.notifications.email) {
			$scope.notificationEmail = session.user.notifications.email;
		}
		else {
			$scope.notificationEmail = session.user.email;	
		}
	}
	$scope.messages = messages;

	var saveUser = function (user, callback) {
		$http.put('/data/user', user)
		.success(function() {
			session.user = user;
			session.save();

			if (callback) {
				callback();
			}
		})
		.error(function (data, status) {
			console.log(data);
		});
	};

	$scope.updateUser = function (name, email) {
		var data = session.user;
		data.name = name;
		data.email = email;

		saveUser(data, function () {
			messages.user = "Profile updated."
		});
	};

	$scope.updateNotificationEmail = function (address) {
		if (!address) {
			messages.notificationEmail = "Sorry, we'd like an email address."
			return;
		}
		var data = session.user;
		data.notifications = session.user.notifications || {};
		data.notifications.email = address;

		saveUser(data, function () {
			messages.notificationEmail = "Address updated.";
		});
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
ProfileCtrl.$inject = ['session', '$scope', '$http'];