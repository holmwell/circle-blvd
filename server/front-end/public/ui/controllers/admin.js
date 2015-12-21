'use strict';

function AdminCtrl(session, stories, $scope, $http, $route, $window, errors) {

	var activeCircle = session.activeCircle;
	var impliedGroup = undefined;
	var successes = {};
	$scope.messages = {};

	if ($scope.showBackBar) {
		$scope.showBackBar();
	}

	var getBaseUrl = function () {
		var location = $window.location;
		return location.protocol + '//' + location.host;
	};

	var getCircleData = function () {
		$http.get('/data/circle/' + activeCircle)
		.success(getCircleSuccess)
		.error(getCircleFailure);

		function getCircleSuccess(data, status) {
			$scope.circleName = data.name;
			$scope.isArchived = data.isArchived || false;
			if (data.colors) {
				$scope.milepostBackground = data.colors.mileposts.background;
				$scope.milepostForeground = data.colors.mileposts.foreground;
			}
		}

		function getCircleFailure(data, status) {
			errors.log(data, status)
		}
	};

	$scope.saveCircleName = function (circleName) {
		var data = {
			name: circleName
		};
		$http.put('/data/circle/' + activeCircle + '/name', data)
		.success(function () {
			$scope.messages.name = "Ok!";
			// TODO: Emit an event and catch it at TopLevelCtrl,
			// instead of a full page refresh.
			$route.reload();
		})
		.error(errors.handle);
	};

	$scope.saveMilepostColors = function (background, foreground) {
		var data = {
			background: background,
			foreground: foreground
		};
		$http.put('/data/circle/' + activeCircle + '/colors/mileposts', data)
		.success(function () {
			$scope.messages.milepostColors = "Ok!";
		})
		.error(errors.handle);
	};

	var getInviteUrl = function (invite) {
		return getBaseUrl() + '/invite/' + invite._id;
	};
	$scope.getInviteUrl = getInviteUrl;

	var isCreatingInvite = false;
	$scope.createInvite = function (inviteName, inviteEmail) {
		if (isCreatingInvite) {
			return;
		}
		isCreatingInvite = true;

		var inviteData = {};
		inviteData.name = inviteName;
		if (inviteEmail) {
			inviteData.email = inviteEmail;
		}

		$http.post('/data/circle/' + activeCircle + '/invite', inviteData)
		.success(function (data) {
			$scope.inviteUrl = getInviteUrl(data);
			isCreatingInvite = false;
			getLatestInviteData();
			// Reset the UI
			$scope.inviteForm.$setPristine();
			$scope.invite = {};
		})
		.error(function (data, status) {
			isCreatingInvite = false;
			errors.handle(data, status);
		});
	};

	// TODO: Refactor. This is also defined in story.js
	$scope.isNotificationEnabled = function () {
		if (session.settings && session.settings['smtp-enabled'].value) {
			return true;
		}
		return false;
	};


	$scope.isGroupImplied = function (group) {
		if (group && group.name) {
			return group.name === "_implied";
		}
		return false;
	};

	$scope.removeMember = function (member) {
		var data = member;

		$http.put('/data/circle/' + activeCircle + '/member/remove', data)
		.success(function() {
			getLatestMemberData();
		})
		.error(errors.handle);
	};

	var selectedMember = undefined;

	$scope.saveGroups = function (member) {
		var data = member;
		$http.put('/data/circle/' + activeCircle + '/member/groups', data)
		.success(function () {
			getLatestMemberData();
			selectedMember = undefined;
		})
		.error(errors.handle);
	};

	$scope.showDetails = function (member) {
		selectedMember = member;
	};

	$scope.isShowing = function (member) {
		if (!selectedMember) {
			return false;
		}

		return member._id === selectedMember._id;
	};

	var isInGroup = function (member, groupName) {
		for (var key in member.memberships) {
			var membership = member.memberships[key];
			var group = groupNames[membership.group];
			if (group && group.name === groupName) {
				return true;
			}
		}
		return false;
	};

	var processMemberGroups = function () {
		if (!successes.members || !successes.groups) {
			return;
		}

		var members = $scope.members;
		var groups = $scope.groups;

		for (var key in members) {
			var member = members[key];
			member.groups = {};
			for (var groupKey in groups) {
				var group = groups[groupKey];
				if (isInGroup(member, group.name)) {
					member.groups[group.id] = true;
				}
			}
		}
	};


	var getMembersSuccess = function(data, status, headers, config) {
		if (data === {}) {
			// do nothing. 
		}
		else {
			$scope.members = data;
		}
		successes.members = true;
		processMemberGroups();
	};

	var getMembersFailure = function(data, status, headers, config) { 
		if (status === 401 && $scope.isSignedIn()) {
			// && is admin ...
			$scope.signOut();
			// "The server was restarted. Please sign in again."
		}
	};


	var getLatestMemberData = function() {
		$http.get('/data/circle/' + activeCircle + '/members')
		.success(getMembersSuccess)
		.error(getMembersFailure);
	};


	var getInvitesSuccess = function(data) {
		if (!data || data.length === 0) {
			// do nothing. 
		}
		else {
			// Sort by expiration, newest on top
			data.sort(function (a, b) {
				if (a.expires < b.expires) {
					return 1;
				}
				if (a.expires > b.expires) {
					return -1;
				}
				return 0;
			});
			$scope.invites = data;
		}
	};


	var getLatestInviteData = function () {
		$http.get('/data/circle/' + activeCircle + '/invites')
		.success(getInvitesSuccess)
		.error(errors.log);
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
		successes.groups = true;
		processMemberGroups();
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

	$scope.$watch('isArchived', function (newVal, oldVal) {
		if (typeof $scope.isArchived === 'undefined') {
			return;
		}

		if (newVal === oldVal || typeof oldVal === 'undefined') {
			return;
		}

		var data = {
			isArchived: $scope.isArchived
		};
		$http.put('/data/circle/' + activeCircle + '/archive', data)
		.success(function() {
			$route.reload();
		})
		.error(errors.handle);
	});

	var init = function () {
		$scope.memberGroups = {};

		getCircleData();
		getLatestMemberData();
		getLatestGroupData();
		getLatestInviteData();
	}

	init();
}
AdminCtrl.$inject = ['session', 'stories', '$scope', '$http', '$route', '$window', 'errors'];
