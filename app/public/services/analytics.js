// analytics.js
CircleBlvd.Services.analytics = function ($window, $location) {

	// Reference: 
	// https://developers.google.com/analytics/devguides/collection/analyticsjs/pages
	var trackPage = function () {
		if ($window.ga) {
			ga('send', 'pageview', $location.path());
		}
	};

	return {
		trackPage: trackPage
	};
};
CircleBlvd.Services.analytics.$inject = ['$window', '$location'];