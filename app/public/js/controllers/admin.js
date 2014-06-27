'use strict';

function AdminCtrl(session, $scope, $http, errors) {

	var activeCircle = session.activeCircle;
	var impliedGroup = undefined;

	var addMemberSuccess = function() {
		$scope.memberName = "";
		$scope.memberEmail = "";
		$scope.memberPassword = "";
		
		getLatestMemberData();
	};

	var addMemberFailure = function() {
		errors.handle("Sad inside add member. :(");
	};

	$scope.isGroupImplied = function (group) {
		if (group && group.name) {
			return group.name === "_implied";
		}
		return false;
	};

	$scope.addMember = function(memberName, memberEmail, memberPassword, memberGroups) {
		if (!impliedGroup) {
			errors.handle("Attempt to add a member to a circle without an implied group.");
			return;
		}

		var data = {
			name: memberName,
			email: memberEmail,
			password: memberPassword,
			memberships: []
		};

		for (var groupId in memberGroups) {
			if (memberGroups[groupId] === true) {
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
		.success(addMemberSuccess)
		.error(addMemberFailure);
	};

	$scope.removeMember = function (member) {
		var data = member;

		$http.put('/data/' + activeCircle + '/user/remove', data)
		.success(function() {
			getLatestMemberData();
		})
		.error(function (data, status) {
			errors.handle(data, status);
		});
	};

	var getMembersSuccess = function(data, status, headers, config) {
		if (data === {}) {
			// do nothing. 
		}
		else {
			$scope.members = data;
		}
	};

	var getMembersFailure = function(data, status, headers, config) { 
		if (status === 401 && $scope.isSignedIn()) {
			// && is admin ...
			$scope.signOut();
			// "The server was restarted. Please sign in again."
		}
	};

	var getLatestMemberData = function() {
		$http.get('/data/' + activeCircle + '/users')
		.success(getMembersSuccess)
		.error(getMembersFailure);
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
			errors.log(data, status);
		});
	};

	var addGroupSuccess = function() {
		$scope.groupName = "";
		getLatestGroupData();
	};

	var addGroupFailure = function(data, status) {
		errors.handle(data, status);
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
		.error(function (data, status) {
			errors.handle(data, status);
		});
	};

	var init = function () {
		$scope.memberGroups = {};

		getLatestMemberData();
		getLatestGroupData();
	}

	init();
}
AdminCtrl.$inject = ['session', '$scope', '$http', 'errors'];
