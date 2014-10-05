'use strict';

function TopLevelCtrl(session, lib, $scope, $http, $location, $route, $timeout, analytics) {

	$scope.isHeaderVisible = true;
	$scope.keyboard = {};

	// If children want to hide the top header.
	$scope.hideHeader = function () {
		$scope.isHeaderVisible = false;
	};

	$scope.setMindset = function (m) {
		lib.mindset.set(m);
		$scope.$broadcast('mindsetChanged', lib.mindset.get());
	};

	$scope.isMindset = function (m) {
		return lib.mindset.is(m);
	};

	$scope.keydown = function(e) {
		if (e.target.type === "textarea" ||
			e.target.type === "text" ||
			e.target.type === "email" ||
			e.target.type === "password") {
			// Ignore things while we're actually typing.
			return;
		}

		if (e.keyCode === 16) {
			$scope.keyboard.isShiftDown = true;
		}
		if (e.keyCode === 49) { // "1"
			$scope.setMindset('detailed');
		}
		if (e.keyCode === 50) { // "2"
			$scope.setMindset('bump');
		}
		if (e.keyCode === 51) { // "3"
			$scope.setMindset('roadmap');
		}
	};

	$scope.keyup = function (e) {
		if (e.keyCode === 16) {
			$scope.keyboard.isShiftDown = false;
		}
	};

	$scope.isSignedIn = function() {
		if (session.user && session.user.email) {
			return true;
		}

		return false;
	};

	var isInGroup = function (groupName, circleId) {
		if ($scope.isSignedIn()) {
			var memberships = session.user.memberships;
			for (var membershipKey in memberships) {
				if (circleId && memberships[membershipKey].circle !== circleId) {
					continue;
				}

				if (memberships[membershipKey].name === groupName) {
					return true;
				}
			}
		}
		return false;
	};

	$scope.isAdmin = function () {
		return isInGroup("Administrative", session.activeCircle);
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
		session.activeCircle = circle._id;
		session.save();
		if (refreshPage) {
			$location.path("/");
			$route.reload();
		}
	};

	$scope.isCurrentPath = function (val) {
		var path = $location.path();
		if (!path) {
			return false;
		}

		return path === val || (path.indexOf(val) === 0);
	};

	$scope.$on('setActiveCircle', function (e, circle, refreshPage, callback) {
		$scope.setActiveCircle(circle, refreshPage);
		if (!refreshPage && callback) {
			callback();
		}
	});

	$scope.getActiveCircleName = function () {
		if (!session || !session.activeCircle || !session.circleList) {
			return;
		}

		var activeCircle = undefined;
		angular.forEach(session.circleList, function (circle) {
			if (circle.id === session.activeCircle) {
				activeCircle = circle;
			}
		});

		if (activeCircle) {
			return activeCircle.name;
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

	var collapseNavbar = function () {
		$timeout(function () {
			var navbar = $('#navigation-circles');
			if (navbar.hasClass('collapse') && navbar.hasClass('in')) {
				navbar.collapse('hide');
			}
		}, 100);
	};

	// This is very brittle. Please feel free to create
	// a better solution.
	$scope.$on('$viewContentLoaded', function() {
		scrollToTop();
		collapseNavbar();
	});

	$scope.showErrorModal = function () {
		var options = {
			// In defaults we trust!
		};
		$('#errorModal').modal(options);
	};

	$scope.reload = function () {
		$route.reload();
	};

	$scope.$on('circleblvd-error', function (e, err) {
		$scope.showErrorModal();
	});

	var enableAnalytics = function () {
		// Send a few basic things up to Google Analytics,
		// to measure site activity.
		$scope.$on('storySelected', function () {
			analytics.trackEvent('story', 'opened');
		});

		$scope.$on('storyMoved', function () {
			analytics.trackEvent('story', 'moved');
		});

		$scope.$on('storyMovedToTop', function () {
			analytics.trackEvent('story', 'movedToTop');
		});

		$scope.$on('storySaved', function () {
			analytics.trackEvent('story', 'saved');
		});

		$scope.$on('storyArchived', function () {
			analytics.trackEvent('story', 'archived');
		});
	}(); // closure

	var init = function() {
		$scope.$on('$routeChangeSuccess', function () {
			$scope.isHeaderVisible = true;
			var path = $location.path();
			if (path === '/initialize') {
				return;
			}
			// Don't save /signin or /invite paths
			if (path !== '/signin' && path.indexOf('/invite') !== 0) {
				session.lastLocationPath = $location.path();	
			}

			analytics.trackPage();

			$http.get('/data/user')
			.success(function (user) {
				session.user = user;

				var buildCircleList = function() {
					var circleList = {};
					var memberships = user.memberships;
					for (var key in memberships) {
						if (memberships[key].circle) {
							circleList[memberships[key].circle] = {
								_id: memberships[key].circle, 
								id: memberships[key].circle,
								name: memberships[key].circleName
							};
						}
					}

					session.circleList = circleList;
				}(); // closure
				
				session.save();
			})
			.error(function (data, status, headers, config) {
				if ($scope.isSignedIn()) {
					$scope.signOut();	
				}

				if (path !== '/signin' 
					&& path !== '/docs'
					&& path !== '/tour'
					&& path.indexOf('/tour') !== 0
					&& path !== '/sponsor'
					&& path !== '/donate'
					&& path !== '/about'
					&& path !== '/invite'
					&& path.indexOf('/invite') !== 0) {
					$scope.signOut();
				}
			});
		});	

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
TopLevelCtrl.$inject = ['session', 'lib', '$scope', '$http', '$location', '$route', '$timeout', 'analytics'];