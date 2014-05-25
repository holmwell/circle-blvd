'use strict';

function AdminCtrl(session, $scope, $http) {

	var activeCircle = session.activeCircle;
	var impliedGroup = undefined;

	var addUserSuccess = function() {
		$scope.userName = "";
		$scope.userEmail = "";
		$scope.userPassword = "";
		
		getLatestUserData();
	};

	var addUserFailure = function() {
		console.log("Sad inside add user. :(");
	};

	$scope.isGroupImplied = function (group) {
		if (group && group.name) {
			return group.name === "_implied";
		}
		return false;
	};

	$scope.addUser = function(userName, userEmail, userPassword, userGroups) {
		if (!impliedGroup) {
			// TODO: Error. Not allowed.
			console.log("Attempt to add a user to a circle without an implied group.");
			return;
		}

		var data = {
			name: userName,
			email: userEmail,
			password: userPassword,
			memberships: []
		};

		for (var groupId in userGroups) {
			if (userGroups[groupId] === true) {
				data.memberships.push({
					circle: activeCircle,
					group: groupId,
					level: "member"
				});
			}
		}

		// Add the implied group
		// TODO: This should be on the server.
		data.memberships.push({
			circle: activeCircle,
			group: impliedGroup.id,
			level: "member"
		});	
		
		$http.post('/data/' + activeCircle + '/user', data)
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
		$http.get('/data/' + activeCircle + '/users')
		.success(getUsersSuccess)
		.error(getUsersFailure);
	};


	var groupNames = {};
	$scope.getGroupName = function (groupId) {
		var group = groupNames[groupId];
		if ($scope.isGroupImplied(group)) {
			return;
		}
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

				if ($scope.isGroupImplied(group)) {
					impliedGroup = group;
				}
			}
		}
	};

	var getLatestGroupData = function() {
		$http.get('/data/' + activeCircle + '/groups')
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
			projectId: activeCircle // TODO: Notion of projects inside groups, yes?
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

	var init = function () {
		$scope.userGroups = {};

		getLatestUserData();
		getLatestGroupData();
	}

	init();
}
AdminCtrl.$inject = ['session', '$scope', '$http'];
