// I don't know why this service exists, but it works
// around various issues that are related to Angular
// and my understanding.

CircleBlvd.Services.hacks = function ($timeout) {
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

	return {
		focus: focusElement
	}
};
CircleBlvd.Services.hacks.$inject = ['$timeout'];