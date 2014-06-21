function DocsCtrl(session, $scope) {

	var me = "Me";

	$scope.whoami = me;	
	$scope.isFacade = true;

	var firstStory = {
		"_id": "1",
		"id": "1",
		"nextId": "2",
		"isFirstStory": true,
		"summary": "This story is done.",
		"owner": "Phil",
		"status": "done",
		"createdBy": {
		  "name": "Phil",
		},
		"comments": [
		  {
			"text": "Comment!",
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
		"nextId": "3",
		"summary": "This one is in progress",
		"status": "active",
		"createdBy": {
		  "name": "Phil",
		}
	  },
	  "3": {
		"id": "3",
		"nextId": "3.5",
		"summary": "Nobody is assigned to this story",
		"createdBy": {
		  "name": "Phil",
		}
	  },
	  "3.5": {
	  	"id": "3.5",
	  	"nextId": "4",
	  	"owner": me,
	  	"summary": "You're assigned to this new story",
	  	"createdBy": {
		  "name": "Phil",
		}
	  },
	  "4": {
		"id": "4",
		"nextId": "5",
		"summary": "There's an issue with this story",
		"status": "sad",
		"createdBy": {
		  "name": "Phil",
		}
	  },
	  "5": {
		"id": "5",
		"nextId": "6",
		"summary": "Next meeting",
		"isNextMeeting": true,
	  },
	  "6": {
		"id": "6",
		"nextId": "7",
		"summary": "Use the grippy cross, on the right, to move stories",
		"status": "",
		"createdBy": {
		  "name": "Phil",
		}
	  },
	  "7": {
		"id": "7",
		"nextId": "8",
		"summary": "Click stories to see details",
		"description": ":-)",
		"createdBy": {
		  "name": "Phil",
		}
	  },
	  "8": {
		"id": "8",
		"nextId": "9",
		"summary": "Use mileposts as waypoints in your journey",
		"status": "",
		"description": "Things.",
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
DocsCtrl.$inject = ['session', '$scope'];