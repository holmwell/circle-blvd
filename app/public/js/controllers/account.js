'use strict';

function AccountCtrl(session, $scope, $http) {

	$scope.user = session.user;

	$scope.updateUser = function (user) {
		$http.put('/data/user', user)
		.success(function() {
			session.user = user;
			session.save();
		})
		.error(function (data, status) {
			console.log(data);
		})
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