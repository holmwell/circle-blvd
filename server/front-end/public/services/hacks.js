// I don't know why this service exists, but it works
// around various issues that are related to Angular
// and my understanding.

CircleBlvd.Services.hacks = function ($timeout) {
	var that = this;
	var focusElement = function (elementId) {
		var element = document.getElementById(elementId);
		if (element) {
			// We want this to happen after this method
			// finishes.
			$timeout(function() {
				element.focus();
			}, 0);
		}
	};


	this.runAddTest = function (stories, circleId) {
		var projectId = circleId;
		var s = [{
   			"summary": "one",
   			"projectId": "1"
		},{
   			"summary": "two",
   			"projectId": "1"
		},{
   			"summary": "three",
   			"projectId": "1"
		}];

		stories.insertFirst(s[0], projectId, function (err, story) {
			console.log("0");
			console.log(story);
		});

		stories.insertFirst(s[1], projectId, function (err, story) {
			console.log("1");
			console.log(story);
		});

		stories.insertFirst(s[2], projectId, function (err, story) {
			console.log("2");
			console.log(story);
		});

		stories.insertFirst(s[2], projectId, function (err, story) {
			console.log("2");
			console.log(story);
		});

		stories.insertFirst(s[2], projectId, function (err, story) {
			console.log("2");
			console.log(story);
		});

		stories.insertFirst(s[2], projectId, function (err, story) {
			console.log("2");
			console.log(story);
		});

		stories.insertFirst(s[2], projectId, function (err, story) {
			console.log("2");
			console.log(story);
		});

		stories.insertFirst(s[2], projectId, function (err, story) {
			console.log("2");
			console.log(story);
		});
	};

	return {
		focus: focusElement,
		runAddTest: that.runAddTest
	}
};
CircleBlvd.Services.hacks.$inject = ['$timeout'];

angular.module('CircleBlvd.services')
.factory('hacks', CircleBlvd.Services.hacks);