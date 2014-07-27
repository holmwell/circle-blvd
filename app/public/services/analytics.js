// analytics.js
CircleBlvd.Services.analytics = function ($window, $location) {

	// Reference: 
	// https://developers.google.com/analytics/devguides/collection/analyticsjs/pages
	var trackPage = function () {
		if ($window.ga) {
			$window.ga('send', 'pageview', $location.path());
		}
	};

	var trackEvent = function (label) {
		if ($window.ga) {
			$window.ga('send', 'event', 'button', 'click', label);
		}
	};

	return {
		trackPage: trackPage,
		trackEvent: trackEvent
	};
};
CircleBlvd.Services.analytics.$inject = ['$window', '$location'];