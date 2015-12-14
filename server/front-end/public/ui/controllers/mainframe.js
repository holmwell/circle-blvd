'use strict';

function MainframeCtrl(session, $scope, $http, errors) {

	var handleError = function (data, status) {
		errors.handle(data, status);
	};

	var circleStats = undefined;
	var circleDict = undefined;

	var maybeUpdateStats = function () {
		var now = Date.now();
		if (circleStats && circleDict) {
			// We have circle stats and the circle dict. 
			// Combine the two.
			$scope.circleStats = [];
			for (var circleId in circleStats) {
				var stat = circleStats[circleId];
				var circle = circleDict[circleId];
				var lastArchiveDate = new Date(stat.max);
				var eightMonths = 1000 * 60 * 60 * 24 * 30 * 8;

				if (now - eightMonths < lastArchiveDate.getTime()) {
					$scope.circleStats.push({
						name: circle.name,
						lastArchiveTimestamp: lastArchiveDate.toDateString(),
						archiveCount: stat.count,
						sortKey: stat.max
					});

					// Sort by most recently active
					$scope.circleStats.sort(function (a, b) {
						return b.sortKey - a.sortKey;
					});
				}
			}
		}
	};

	var getLatestCircleData = function () {

		var getCirclesSuccess = function(data, status, headers, config) {
			if (data === {}) {
				$scope.circleCount = 0;
			}
			else {
				$scope.circle = undefined;
				$scope.circles = data;
				$scope.circleCount = data.length;

				// Build a dictionary to tie in to the stats. This will
				// obviously not work with millions of circles, but let's 
				// take this one order of magnitude at a time.
				circleDict = {};
				for (var index in data) {
					var circle = data[index];
					circleDict[circle._id] = circle;
				}
				maybeUpdateStats();
			}
		};

		$http.get('/data/circles/all')
		.success(getCirclesSuccess)
		.error(handleError);
	};


	$scope.addCircle = function (circle) {
		var data = {
			circle: {
				name: circle.name
			},
			admin: {
				email: circle.adminEmail
			}
		};

		$http.post('/data/circle/admin', data)
		.success(getLatestCircleData)
		.error(handleError);
	};


	var getLatestWaitlistData = function () {
		var getWaitlistSuccess = function (data) {
			$scope.waitlist = data;
		}
		$http.get('/data/waitlist')
		.success(getWaitlistSuccess)
		.error(handleError);
	};


	$scope.updateSetting = function (setting) {
		$http.put('/data/setting', setting)
		.success(function() {
			// TODO: Show a fading smiley face or something
			// to indicate success.
			getLatestSettingData();
		})
		.error(handleError);
	};

	var appendSettings = function(data, status, headers, config) {
		if (data === {}) {
			// do nothing. 
		}
		else {
			if (!$scope.settings) {
				$scope.settings = {};
			}

			for (var key in data) {
				$scope.settings[key] = data[key];
			}
		}
	};

	$scope.isBooleanSetting = function(setting) {
		if (typeof(setting.value) === "boolean") {
			return true;
		}
		return false;
	};

	var getLatestSettingData = function() {
		$http.get('/data/settings/authorized')
		.success(function (settings) {
			appendSettings(settings);
		})
		.error(handleError);
	};


	var init = function () {
		getLatestCircleData();
		getLatestWaitlistData();
		getLatestSettingData();

		// TODO: Maybe combine these into one call?
		$http.get('/data/metrics/members/count')
		.success(function (count) {
			$scope.memberCount = count;
		});

		$http.get('/data/metrics/members/admins/count')
		.success(function (count) {
			$scope.adminCount = count;
		});

		$http.get('/data/metrics/circles/stats')
		.success(function (stats) {
			circleStats = stats;
			maybeUpdateStats();
		});
	}
	init();
}
MainframeCtrl.$inject = ['session', '$scope', '$http', 'errors'];
