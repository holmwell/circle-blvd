'use strict';

function TopLevelCtrl(session, $scope, $http, $location, $route) {

	$scope.keyboard = {};

	$scope.keydown = function(e) {
		if (e.target.type === "textarea" ||
			e.target.type === "text") {
			// Ignore things while we're actually typing.
			return;
		}

		if (e.keyCode === 16) {
			$scope.keyboard.isShiftDown = true;
		}
	};

	$scope.keyup = function (e) {
		if (e.keyCode === 16) {
			$scope.keyboard.isShiftDown = false;
		}
	};

	$scope.isSignedIn = function() {
		if (session && session.user && session.user.email) {
			return true;
		}

		return false;
	};

	var isInGroup = function (groupName) {
		if ($scope.isSignedIn()) {
			var memberships = session.user.memberships;
			for (var membershipKey in memberships) {
				if (memberships[membershipKey].name === groupName) {
					return true;
				}
			}
		}
		return false;
	};

	$scope.isAdmin = function () {
		return isInGroup("Administrative");
	};

	$scope.hasMainframeAccess = function () {
		return isInGroup("Mainframe");
	};

	$scope.getAccountName = function () {
		if (session && session.user) {
			return session.user.name;
		}
	};

	$scope.setActiveCircle = function (circle, refreshPage) {
		session.activeCircle = circle.id;
		session.save();
		if (refreshPage) {
			$location.path("/");
			$route.reload();
		}
	};

	$scope.isActiveCircle = function (circle) {
		if (!circle || !session) {
			return false;
		}
		return session.activeCircle === circle.id;
	};

	$scope.circleList = function () {
		if ($scope.isSignedIn()) {
			return session.circleList;
		}
	};

	var resetSession = function () {
		// clear out the logged in user
		session.user = {};
		session.save();
	};

	$scope.signOut = function() {
		$http.get('/auth/signout')
		.success(function () {
			resetSession();
			$location.path("/signin");
		})
		.error(function (data, status, headers, config) {
			// TODO: Is there anything to do?
			console.log(data);
		});
	};

	$scope.isEqual = function (a, b) {
		return a === b;
	};

	// HACK: This is a workaround for Safari not scrolling to 
	// the top of the page when we change location / views.
	var scrollToTop = function () {
		$('html, body').animate({
			scrollTop: $("#topLevel").offset().top
		}, 100);
	};

	// This is very brittle. Please feel free to create
	// a better solution.
	$scope.$on('$viewContentLoaded', function() {
		scrollToTop();
	});


	var init = function() {
		if (session.isExpired) {
			$http.get('/data/user')
			.success(function (user) {
				session.user = user;
				session.save();
			})
			.error(function (data, status, headers, config) {
				resetSession();
			});
		}

		// TODO: What's an efficient way of doing this?
		// Does CouchDB take care of that? (ish?)
		$http.get('/data/settings')
		.success(function (settings) {
			session.settings = settings;
		})
		.error(function (data, status) {
			// Do nothing.
		});
	};

	init();
}
TopLevelCtrl.$inject = ['session', '$scope', '$http', '$location', '$route'];