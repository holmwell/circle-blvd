'use strict';

function SignInCtrl(signInName, session, lib, $scope, $location, $window, $http) {

	$scope.signup = {};
	$scope.signup.once = false;

	var hash = $window.location.hash;
	if (hash.indexOf('/') >= 0) {
		session.lastLocationPath = hash.slice(hash.indexOf('/'));

		// Redirect to the page if it is public and does not
		// require a signin.
		var path = $location.path();

		// isPagePublic is defined in TopLevelCtrl, and it is
		// a bad practice to use scope inheritance like this.
		if ($scope.isPagePublic(path) && path !== "/sponsor") {
			$window.location.href = path;
		}
	}

	var goHome = function (user, session, callback) {
		var defaultGroup = undefined;

		var onCircleFound = function (circle) {
			var defaultCircle = "1";
			session.activeCircle = circle || defaultCircle;
			session.user = user;
			session.save();

			if (session.lastLocationPath) {
				$window.location.href = "/#" + session.lastLocationPath;
				callback();
			}
			else {
				$window.location.href = "/";
				callback();
			}
		};

		if (user.memberships && user.memberships.length > 0) {
			var membershipIndex = 0;

			// Find the first group we're a part of that has a
			// circle associated with it, and that's our default circle.
			var tryToFindGroupStartingAtIndex = function (index) {
				defaultGroup = user.memberships[index].group;

				$http.get('/data/group/' + defaultGroup)
				.success(function (group) {
					if (group.projectId) {
						onCircleFound(group.projectId);
					}
					else {
						index++;
						if (index < user.memberships.length) {
							tryToFindGroupStartingAtIndex(index);
						}
						else {
							// There are no circles!
							onCircleFound(null);
						}
					}
				})
				.error(function () {
					var err = new Error("Sorry, the server failed to get your circle.");
					callback(err);
				});
			};

			tryToFindGroupStartingAtIndex(0);
		}
		else {
			callback(null);
		}
	};


	$scope.signIn = function() {

		var success = function(user) {
			$scope.message = "Success!";

			if ($scope.rememberMe) {
				signInName.set(user.email);	
			}

			goHome(user, session, function (err) {
				if (err) {
					$scope.message = err.message;
					return;
				}
				else {
					// Even though we changed the href above,
					// we don't refresh automatically unless
					// the URL changes, so force a reload here.
					$window.location.reload();
				}
			});
		};

		var failure = function(data, status) {
			$scope.message = "Sorry, please try something else."
			if (status === 429) {
				$scope.message = "Sorry, it seems someone is trying " + 
				"to guess your password, so we aren't allowing any more sign-in " + 
				"attempts, today. Please call us to be allowed into the site.";
			}
		};

		var email = $scope.user.email;
		var password = $scope.user.password;

		lib.signIn(email, password, function (err, user) {
			if (err) {
				failure(err, err.status);
				return;
			}
			success(user);
		});
	};


	$scope.signUp = function() {
		if ($scope.signup.once) {
			return;
		}
		$scope.signup.once = true;

		var success = function (data) {
			$scope.signup.message = "Thank you. :-)";
	
			$scope.user = {};
			$scope.user.email = $scope.signup.email;
			$scope.user.password = $scope.signup.password;

			session.lastLocationPath = "/";
			$scope.signIn();
		};
		
		var failure = function (data, status) {
			var message = "Sorry, our computers aren't working. " + 
			"Please try again at a later time.";
			if (status === 400 || status === 403) {
				// we have a well-known error.
				message = data;
			}
			$scope.signup.message = message;
		};

		var data = {
			circle: $scope.signup.circle,
			name: $scope.signup.name,
			email: $scope.signup.email,
			password: $scope.signup.password
		};

		$http.post('/data/signup/now', data)
		.success(success)
		.error(failure);
	};

	$scope.isPaymentEnabled = function () {
		if (session.settings) {
			if (session.settings['stripe-public-key']) {
				return true;
			}
			return false;
		}
		return false;
	};

	var init = function () {
		// Redirect to home if we're already signed in.
		if ($scope.isSignedIn() && $window.location.pathname !== "/") {
			$window.location.href = "/";
			return;
		}

		lib.mindset.set('detailed');
		$scope.user = {};

		var name = signInName.get();
		if (name) {
			$scope.user.email = name;
		}

		$scope.rememberMe = true;
	};

	init();	
}
SignInCtrl.$inject = ['signInName', 'session', 'lib', '$scope', '$location', '$window', '$http'];