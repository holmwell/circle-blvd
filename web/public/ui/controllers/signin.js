'use strict';

function SignInCtrl(signInName, session, lib, $scope, $window, $http) {

	$scope.signup = {};
	$scope.signup.once = false;

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
		if ($scope.isSignedIn()) {
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


	var me = "Me";

	$scope.whoami = me;	
	$scope.isFacade = true;

	var firstStory = {
		"_id": "1",
		"id": "1",
		"nextId": "2",
		"isFirstStory": true,
		"summary": "Best for groups of 3 to 10 people",
		"description": "Hi! This is the first story in this story-list " +
		"demonstration. Please stomp around and see what this thing can " +
		"do.",
		"owner": "Alaina",
		"status": "done",
		"createdBy": {
		  "name": "Phil",
		},
		"comments": [
		  {
			"text": "A bigger demo is at http://circleblvd.org/#/tour. :-)",
			"createdBy": {
			  "name": "Phil",
			},
			"timestamp": 1402388429872
		  }
		]
	};

	var introStories = {
	  "1": firstStory,
	  "2": {
		"id": "2",
		"nextId": "3",
		"owner": me,
		"summary": "Manage tasks, track progress, plan ahead",
		"description": "It's true!",
		"status": "",
		"createdBy": {
		  "name": "Phil",
		}
	  },
	  "3": {
		"id": "3",
		"nextId": "4",
		"summary": "Made for volunteer organizations, clubs and meetups",
		"status": "",
		"description": "Mileposts can be useful if things need to be " + 
		"done before or after a specific event.",
		isDeadline: true
	  },
	  "4": {
		"id": "4",
		"nextId": "5",
		"summary": "#Free to try out",
		"description": "What needs to be done before your next meeting? " +
		"Move this special task to bring your team's focus to the top of " + 
		"your list.",
		labels: ['Free'],
		"isNextMeeting": true,
	  },
	  "5": {
		"id": "5",
		"nextId": "last-intro",
		"owner": "Phil",
		"summary": "Created in Corvallis, Oregon",
		"description": ":-)",
		"status": "active",
		"createdBy": {
		  "name": "Phil",
		}
	  }
	};

	$scope.introduction = {
		firstStory: firstStory,
		allStories: introStories
	};

	init();	
}
SignInCtrl.$inject = ['signInName', 'session', 'lib', '$scope', '$window', '$http'];