function SignInCtrl(signInName, session, $scope, $location, $http) {

	$scope.signup = {};

	$scope.signUp = function() {
		$scope.signup.message = "Thank you. :-)";
	};

	$scope.signIn = function() {
		var success = function(data, status, headers, config) {
			$scope.message = "Success!";

			var user = data;
			if ($scope.rememberMe) {
				signInName.set(user.email);	
			}

			var buildCircleList = function() {
				var circleList = {};
				var memberships = user.memberships;
				for (var key in memberships) {
					if (memberships[key].circle) {
						circleList[memberships[key].circle] = {
							id: memberships[key].circle,
							name: memberships[key].circleName
						};
					}
				}

				session.circleList = circleList;
			}(); // closure
			
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

				if (session.lastLocationPath) {
					$location.path(session.lastLocationPath);
				}
				else {
					$location.path("/");	
				}
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
SignInCtrl.$inject = ['signInName', 'session', '$scope', '$location', '$http'];