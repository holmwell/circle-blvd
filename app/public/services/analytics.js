// analytics.js
CircleBlvd.Services.analytics = function ($window, $location) {

	// Reference: 
	// https://developers.google.com/analytics/devguides/collection/analyticsjs/pages
	var trackPage = function () {
		if ($window.ga) {
			$window.ga('send', 'pageview', $location.path());
		}
	};

	var trackEvent = function (category, action) {
		if ($window.ga) {
			$window.ga('send', 'event', category, action);
		}
	};

	return {
		trackPage: trackPage,
		trackEvent: trackEvent
	};
};
CircleBlvd.Services.analytics.$inject = ['$window', '$location'];