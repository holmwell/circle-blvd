function DocsCtrl(session, $scope) {
	
	$scope.isFacade = true;

	var storiesBlob = {
	  "13a7b00b3837a7abf3e0077df726181e": {
	    "id": "13a7b00b3837a7abf3e0077df726181e",
	    "nextId": "13a7b00b3837a7abf3e0077df7262af9",
	    "isFirstStory": true,
	    "summary": "first",
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
	  },
	  "13a7b00b3837a7abf3e0077df7262af9": {
	    "id": "13a7b00b3837a7abf3e0077df7262af9",
	    "nextId": "13a7b00b3837a7abf3e0077df72612df",
	    "summary": "second",
	    "createdBy": {
	      "name": "Phil",
	    }
	  },
	  "13a7b00b3837a7abf3e0077df72612df": {
	    "id": "13a7b00b3837a7abf3e0077df72612df",
	    "nextId": "13a7b00b3837a7abf3e0077df72611eb",
	    "summary": "third",
	    "createdBy": {
	      "name": "Phil",
	    }
	  },
	  "13a7b00b3837a7abf3e0077df72611eb": {
	    "id": "13a7b00b3837a7abf3e0077df72611eb",
	    "nextId": "13a7b00b3837a7abf3e0077df725ffc3",
	    "summary": "fourth",
	    "createdBy": {
	      "name": "Phil",
	    }
	  },
	  "13a7b00b3837a7abf3e0077df725ffc3": {
	    "id": "13a7b00b3837a7abf3e0077df725ffc3",
	    "nextId": "13a7b00b3837a7abf3e0077df725abaa",
	    "summary": "fifth",
	    "owner": "Phil",
	    "status": "",
	    "createdBy": {
	      "name": "Phil",
	    }
	  },
	  "13a7b00b3837a7abf3e0077df725abaa": {
	    "id": "13a7b00b3837a7abf3e0077df725abaa",
	    "nextId": "13a7b00b3837a7abf3e0077df725e31d",
	    "summary": "sixth",
	    "status": "",
	    "createdBy": {
	      "name": "Phil",
	    }
	  },
	  "13a7b00b3837a7abf3e0077df725e31d": {
	    "id": "13a7b00b3837a7abf3e0077df725e31d",
	    "nextId": "13a7b00b3837a7abf3e0077df71f8e5a",
	    "summary": "seventh",
	    "createdBy": {
	      "name": "Phil",
	    }
	  },
	  "13a7b00b3837a7abf3e0077df71f8e5a": {
	    "id": "13a7b00b3837a7abf3e0077df71f8e5a",
	    "nextId": "13a7b00b3837a7abf3e0077df725ef78",
	    "summary": "Next meeting",
	    "status": "",
	    "description": "Things.",
	    "isNextMeeting": true
	  },
	  "13a7b00b3837a7abf3e0077df725ef78": {
	    "id": "13a7b00b3837a7abf3e0077df725ef78",
	    "nextId": "13a7b00b3837a7abf3e0077df725f26e",
	    "summary": "eighth",
	    "owner": "Phil",
	    "status": "",
	    "createdBy": {
	      "name": "Phil",
	    }
	  },
	  "13a7b00b3837a7abf3e0077df725f26e": {
	    "id": "13a7b00b3837a7abf3e0077df725f26e",
	    "nextId": "last-13a7b00b3837a7abf3e0077df71f876b",
	    "summary": "ninth",
	    "createdBy": {
	      "name": "Phil",
	    }
	  }
	};

	var firstStory = {
	  "_id": "13a7b00b3837a7abf3e0077df726181e",
	  "_rev": "59-01e39d97e7caeb4ed6d2db51990a70aa",
	  "summary": "first",
	  "createdBy": {
	    "name": "Phil",
	  },
	  "nextId": "13a7b00b3837a7abf3e0077df7262af9",
	  "type": "story",
	  "timestamp": 1402384319785,
	  "id": "13a7b00b3837a7abf3e0077df726181e",
	  "isFirstStory": true,
	  "lastTransactionId": "bc4f1a43-e92b-47c7-a9ec-aa7cd713638d",
	  "owner": "Phil",
	  "status": "done",
	  "comments": [
	    {
	      "text": "Comment!",
	      "createdBy": {
	        "name": "Phil",
	        "id": "1eb1c0dd20e4f32dc68b882315017df6"
	      },
	      "timestamp": 1402388429872
	    }
	  ]
	};

	$scope.data = {
		firstStory: firstStory,
		allStories: storiesBlob
	};
}
DocsCtrl.$inject = ['session', '$scope'];