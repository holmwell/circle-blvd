'use strict';

function AdminCtrl(session, $scope, $http) {

	var defaultProjectId = "1";

	var addUserSuccess = function() {
		$scope.userName = "";
		$scope.userEmail = "";
		$scope.userPassword = "";
		
		getLatestUserData();
	};

	var addUserFailure = function() {
		console.log("Sad inside add user. :(");
	};

	$scope.addUser = function(userName, userEmail, userPassword, userGroups) {
		var data = {
			name: userName,
			email: userEmail,
			password: userPassword,
			memberships: []
		};

		for (var groupId in userGroups) {
			if (userGroups[groupId] === true) {
				data.memberships.push({
					group: groupId,
					level: "member"
				});
			}
		}

		$http.post('/data/user', data)
		.success(addUserSuccess)
		.error(addUserFailure);
	};

	$scope.removeUser = function (user) {
		var data = user;

		$http.put('/data/user/remove', data)
		.success(function() {
			getLatestUserData();
		})
		.error(function (data) {
			console.log(data);
		});
	};

	var getUsersSuccess = function(data, status, headers, config) {
		if (data === {}) {
			// do nothing. 
		}
		else {
			$scope.users = data;
		}
	};

	var getUsersFailure = function(data, status, headers, config) { 
		if (status === 401 && $scope.isSignedIn()) {
			// && is admin ...
			$scope.signOut();
			console.log("The server was restarted. Please sign in again.");
		}
	};

	var getLatestUserData = function() {
		$http.get('/data/users')
		.success(getUsersSuccess)
		.error(getUsersFailure);
	};


	var groupNames = {};
	$scope.getGroupName = function (groupId) {
		var group = groupNames[groupId];
		if (group) {
			return group.name;
		}
	};

	var getGroupsSuccess = function(data, status, headers, config) {
		if (data === {}) {
			// do nothing. 
		}
		else {
			$scope.groups = data;

			groupNames = {};
			for (var groupKey in data) {
				var group = data[groupKey];
				groupNames[group.id] = group;
			}
		}
	};

	var getLatestGroupData = function() {
		$http.get('/data/' + defaultProjectId + '/groups')
		.success(getGroupsSuccess)
		.error(function (data, status) {
			console.log(data);
			console.log(status);
		});
	};

	var addGroupSuccess = function() {
		$scope.groupName = "";
		getLatestGroupData();
	};

	var addGroupFailure = function(things, status) {
		console.log(things);
		console.log(status);
		console.log("Sad inside add group. :(");
	};

	$scope.addGroup = function (groupName) {
		var data = {
			name: groupName,
			projectId: defaultProjectId // TODO: Notion of projects inside groups, yes?
		};

		$http.post('/data/group', data)
		.success(addGroupSuccess)
		.error(addGroupFailure);
	};

	$scope.removeGroup = function (group) {
		$http.put('/data/group/remove', group)
		.success(function() {
			getLatestGroupData();
		})
		.error(function (data) {
			console.log(data);
		});
	};


	$scope.updateSetting = function (setting) {
		$http.put('/data/setting', setting)
		.success(function() {
			// TODO: Show a fading smiley face or something
			// to indicate success.
			getLatestSettingData();
		})
		.error(function (data) {
			console.log(data);
		});
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

	var getSettingsError = function (data, status) {
		console.log(data);
		console.log(status);
	};

	var getLatestSettingData = function() {
		$http.get('/data/settings/authorized')
		.success(function (settings) {
			appendSettings(settings);
		})
		.error(getSettingsError);
	};


	var init = function () {
		$scope.userGroups = {};

		getLatestUserData();
		getLatestGroupData();
		getLatestSettingData();
	}

	init();
}
AdminCtrl.$inject = ['session', '$scope', '$http'];
