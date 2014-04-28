function SignInCtrl(session, $scope, $location, $http) {

	$scope.signIn = function() {
		var success = function(data, status, headers, config) {
			$scope.message = "Success!";

			var user = data;
			session.user = user;
			session.save();

			$location.path("/");
		};

		var failure = function(data, status, headers, config) {
			$scope.message = "Sorry, please try something else."
		};

		// TODO: This should probably be inside a resource, or whatever
		// the things like $scope and $location are called in Angular.
		// Refactor this when you're in the mood to learn, future-self.
		var signIn = function (user, success, failure) {
			var xsrf = $.param(user);
			var request = {
				method: 'POST',
				url: '/auth/signin',
				data: xsrf,
				headers: {'Content-Type': 'application/x-www-form-urlencoded'}
			};		

			$http(request)
			.success(success)
			.error(failure);
		};

		signIn($scope.user, success, failure);
	};

	if (session.settings && session.settings['demo']) {
		console.log(session.settings);
		$scope.isDemo = session.settings['demo'].value;	
	}
}
SignInCtrl.$inject = ['session', '$scope', '$location', '$http'];