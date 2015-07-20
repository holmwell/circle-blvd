'use strict';

function MainframeCtrl(session, $scope, $http, errors) {

	var handleError = function (data, status) {
		errors.handle(data, status);
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

		$http.get('/data/metrics/members/count')
		.success(function (count) {
			$scope.memberCount = count;
		});
	}
	init();
}
MainframeCtrl.$inject = ['session', '$scope', '$http', 'errors'];
