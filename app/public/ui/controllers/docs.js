'use strict';

function DocsCtrl(session, lib, $scope) {

	var me = "Me";

	$scope.whoami = me;	
	$scope.isFacade = true;
	$scope.isMindset = lib.mindset.is;

	var firstStory = {
		"_id": "1",
		"id": "1",
		"nextId": "2",
		"isFirstStory": true,
		"summary": "This story is done.",
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
			"text": "Stories can have comments. :-)",
			"createdBy": {
			  "name": "Phil",
			},
			"timestamp": 1402388429872
		  }
		]
	};

	var stories1 = {
		"1": firstStory
	};

	var stories2 = {
	  "1": firstStory,
	  "2": {
		"id": "2",
		"nextId": "2.5",
		"owner": "Nicholas",
		"summary": "This one is in progress",
		"description": "They're called 'stories' because, well, we " +
		"don't know why. However, 'tasks' sounds a bit boring, don't you " +
		"think?",
		"status": "active",
		"createdBy": {
		  "name": "Phil",
		}
	  },
	  "2.5": {
		"id": "2.5",
		"nextId": "3",
		"summary": "This is a milepost",
		"status": "",
		"description": "Mileposts can be useful if things need to be " + 
		"done before or after a specific event.",
		isDeadline: true
	  },
	  "3": {
		"id": "3",
		"nextId": "3.25",
		"owner": me,
	  	"summary": "You're assigned to this new story",
	  	"description": "Mash the tiny circle on the left to bump the " +
	  	"status of this story along. Once a story is 'done', it can " + 
	  	"be archived by pressing the large circle. Try it!",
		"createdBy": {
		  "name": "Phil",
		}
	  },
	  "3.25": {
		"id": "3.25",
		"nextId": "3.5",
		"summary": "Next meeting",
		"description": "What needs to be done before your next meeting? " +
		"Move this special story to bring your team's focus to the top of " + 
		"your story list.",
		"isNextMeeting": true,
	  },
	  "3.5": {
	  	"id": "3.5",
	  	"nextId": "4",
		"summary": "Nobody is assigned to this story",
		"description": "Stories without confirmed owners have a question mark" + 
		"next to them.",
	  	"createdBy": {
		  "name": "Phil",
		}
	  },
	  "4": {
		"id": "4",
		"nextId": "6",
		"summary": "There's an issue with this story",
		"description": "Of course, sometimes stories need to be talked about.",
		"status": "sad",
		"createdBy": {
		  "name": "Phil",
		}
	  },
	  "6": {
		"id": "6",
		"nextId": "7",
		"summary": "Use the grippy cross, on the right, to move stories",
		"description": "This works on desktops, laptops, iPads and iPhones, " +
		"but not on Android things (yet).",
		"owner": me,
		"status": "",
		"createdBy": {
		  "name": "Phil",
		}
	  },
	  "7": {
		"id": "7",
		"nextId": "8",
		"summary": "Click stories to see details",
		"description": "Thanks. :-)",
		"createdBy": {
		  "name": "Phil",
		}
	  },
	  "8": {
		"id": "8",
		"nextId": "9",
		"summary": "Use mileposts as waypoints in your journey",
		"status": "",
		"description": "They're the best.",
		isDeadline: true
	  },
	  "9": {
		"id": "9",
		"nextId": "10",
		"summary": "Have fun :-)",
		"status": "",
		"createdBy": {
		  "name": "Phil",
		}
	  },
	  "10": {
		"id": "10",
		"nextId": "last-demo",
		"summary": "That's it.",
		"createdBy": {
		  "name": "Phil",
		}
	  }
	};

	$scope.lesson1 = {
		firstStory: firstStory,
		allStories: stories1
	};

	$scope.lesson2 = {
		firstStory: firstStory,
		allStories: stories2
	};
}
DocsCtrl.$inject = ['session', 'lib', '$scope'];