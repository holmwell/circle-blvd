'use strict';

function SignInCtrl(signInName, session, lib, $scope, $location, $http) {

	$scope.signup = {};
	$scope.signup.once = false;

	$scope.signIn = function() {
		var success = function(user) {
			$scope.message = "Success!";

			if ($scope.rememberMe) {
				signInName.set(user.email);	
			}

			lib.goHome(user, session, function (err) {
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
			$location.path('/');
			return;
		}

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
		"summary": "Circle Blvd is for groups of 3-10 people",
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
			"text": "A bigger demo is at http://circleblvd.org/#/docs. :-)",
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
		"summary": "Manage tasks, keep track of progress, and know what's up",
		"description": "These things are called 'stories' because, well, we " +
		"don't know why. However, 'tasks' sounds a bit boring, don't you " +
		"think?",
		"status": "",
		"createdBy": {
		  "name": "Phil",
		}
	  },
	  "3": {
		"id": "3",
		"nextId": "4",
		"summary": "Made for volunteer organizations",
		"status": "",
		"description": "Mileposts can be useful if things need to be " + 
		"done before or after a specific event.",
		isDeadline: true
	  },
	  "4": {
		"id": "4",
		"nextId": "5",
		"summary": "Plan, focus, and relax",
		"description": "What needs to be done before your next meeting? " +
		"Move this special story to bring your team's focus to the top of " + 
		"your story list.",
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
SignInCtrl.$inject = ['signInName', 'session', 'lib', '$scope', '$location', '$http'];