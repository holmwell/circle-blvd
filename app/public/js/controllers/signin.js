function SignInCtrl(signInName, session, $scope, $location, $http) {

	$scope.signIn = function() {
		var success = function(data, status, headers, config) {
			$scope.message = "Success!";

			var user = data;
			if ($scope.rememberMe) {
				signInName.set(user.email);	
			}

			var getDefaultCircle = function (user, callback) {
				var defaultGroup = undefined;
				if (user.memberships && user.memberships.length > 0) {
					var membershipIndex = 0;

					// Find the first group we're a part of that has a
					// circle associated with it, and that's our default circle.
					var tryToFindGroupStartingAtIndex = function (index) {
						defaultGroup = user.memberships[index].group;

						$http.get('/data/group/' + defaultGroup)
						.success(function (group) {
							if (group.projectId) {
								callback(group.projectId);
							}
							else {
								index++;
								if (index < user.memberships.length) {
									tryToFindGroupStartingAtIndex(index);
								}
								else {
									// There are no circles!
									callback(null);
								}
							}
						})
						.error(function (data, status) {
							$scope.message = "Sorry, the server failed to get your circle.";
						})
					};

					tryToFindGroupStartingAtIndex(0);
				}
				else {
					callback(null);
				}
			};

			var onCircleFound = function (circle) {
				var defaultCircle = "1";
				session.activeCircle = circle || defaultCircle;
				session.user = user;
				session.save();

				$location.path("/");
			};

			getDefaultCircle(user, onCircleFound);
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

	var init = function () {
		$scope.user = {};

		if (session.settings && session.settings['demo']) {
			$scope.isDemo = session.settings['demo'].value;	
		}

		var name = signInName.get();
		if (name) {
			$scope.user.email = name;
		}

		$scope.rememberMe = true;
	};

	init();	
}
SignInCtrl.$inject = ['signInName', 'session', '$scope', '$location', '$http'];