// analytics.js
CircleBlvd.Services.analytics = function ($window, $location) {

	// Reference: 
	// https://developers.google.com/analytics/devguides/collection/analyticsjs/pages
	var trackPage = function () {
		if ($window.ga) {
			var hash = $window.location.hash;
			var path;

			if (hash.length > 0) {
				path = $location.path();
			}
			else {
				path = $window.location.pathname;
			}

			var search = $window.location.search;
			if (search) {
				path = path + search;
			}

			$window.ga('send', 'pageview', path);
		}
	};

	var trackEvent = function (category, action) {
		if ($window.ga) {
			$window.ga('send', 'event', category, action);
		}
	};

	var trackError = function (status) {
		if ($window.ga) {
			$window.ga('send', 'event', 'error', status);
		}
	};

	return {
		trackPage: trackPage,
		trackEvent: trackEvent,
		trackError: trackError
	};
};
CircleBlvd.Services.analytics.$inject = ['$window', '$location'];