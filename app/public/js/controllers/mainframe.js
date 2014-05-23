'use strict';

function MainframeCtrl(session, $scope, $http) {

	var handleError = function (data, status) {
		console.log(data);
		console.log(status);
	};

	var getLatestCircleData = function () {

		var getCirclesSuccess = function(data, status, headers, config) {
			if (data === {}) {
				// do nothing. 
			}
			else {
				$scope.circleName = undefined;
				$scope.circles = data;
			}
		};

		$http.get('/data/circles')
		.success(getCirclesSuccess)
		.error(handleError);
	};


	$scope.addCircle = function (circleName) {
		var data = {
			name: circleName
		};

		$http.post('/data/circle', data)
		.success(getLatestCircleData)
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
		getLatestSettingData();
	}
	init();
}
MainframeCtrl.$inject = ['session', '$scope', '$http'];
