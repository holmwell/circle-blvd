'use strict';

function TopLevelCtrl(session, lib, $scope, $http, $location, $route, $window, $timeout, analytics) {

	$scope.isHeaderVisible = true;
	$scope.keyboard = {};
	$scope.mouse = {};

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

	$scope.setMindsetLabel = function (text) {
		$scope.mindsetLabel = text;
	};

	$scope.mousedown = function (e) {
		$scope.mouse.isButtonDown = true;
		$scope.mouse.isButtonUp = false;
		$scope.mouse.dragStartPoint = {
			x: e.pageX,
			y: e.pageY
		};
		$scope.$broadcast('mouseDown', e);
	};

	$scope.mouseup = function (e) {
		$scope.mouse.isButtonDown = false;
		$scope.mouse.isButtonUp = true;
		$scope.$broadcast('mouseUp', e);
	};

	$scope.mousemove = function (e) {
		$scope.mouse.previousPosition = $scope.mouse.position;
		$scope.mouse.position = {
			x: e.pageX,
			y: e.pageY
		};

		if ($scope.mouse.position && $scope.mouse.previousPosition) {
			var previous = $scope.mouse.previousPosition;
			var position = $scope.mouse.position;

			if (previous.y > position.y) {
				$scope.mouse.isMovingUp = true;
				$scope.mouse.isMovingDown = false;
				$scope.mouse.direction = 'up';
			}

			if (previous.y < position.y) {
				$scope.mouse.isMovingUp = false;
				$scope.mouse.isMovingDown = true;
				$scope.mouse.direction = 'down';
			}
		}

		if ($scope.mouse.isButtonDown) {
			$scope.$broadcast('mouseDrag', e);	
		}
	};

	$scope.mouseleave = function (e) {
		$scope.$broadcast('mouseLeave', e);
	}

	$scope.keydown = function(e) {
		if (e.keyCode === 27) { // esc
			$scope.$broadcast('keyEscape', e);
		}

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
		if (e.keyCode === 224 || 
			e.keyCode === 17 || 
			e.keyCode === 91 || 
			e.keyCode === 93) {
			$scope.keyboard.isCommandDown = true;
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
		if (e.keyCode === 52) { // "4"
			$scope.setMindset('mine');
		}

		// Keys for interacting with the highlighted story
		if (e.keyCode === 13) { // enter key
			$scope.$broadcast('keyEnter', e);
		}
		if (e.keyCode === 38) { // up arrow
			$scope.$broadcast('keyUpArrow', e);
		}
		if (e.keyCode === 40) { // down arrow
			$scope.$broadcast('keyDownArrow', e);
		}

		if (e.keyCode === 88 && $scope.keyboard.isCommandDown) {
			// Cmd-X
			$scope.$broadcast('keyCut', e);
		}
		if (e.keyCode === 86 && $scope.keyboard.isCommandDown) {
			// Cmd-V
			$scope.$broadcast('keyPaste', e);
		}
		if (e.keyCode === 67 && $scope.keyboard.isCommandDown) {
			// Cmd-C
			$scope.$broadcast('keyCopy', e);
		}

		if (e.keyCode === 68) {
			// D
			$scope.$broadcast('keyDone', e);
		}

		if (e.keyCode === 87 || e.keyCode === 65) {
			// W or A
			$scope.$broadcast('keyAssigned', e);
		}

		if (e.keyCode === 79 || e.keyCode === 83) {
			// O or S
			$scope.$broadcast('keyActive', e);
		}

		if (e.keyCode === 191) {
			// ? (question mark)
			$scope.$broadcast('keyClearStatus', e);
		}

		if (e.keyCode === 84) {
			// T
			$scope.$broadcast('keyTakeOwnership', e);
		}

		// Scrolling: page up, page down, end, home
		if (e.keyCode === 33
			|| e.keyCode === 34
			|| e.keyCode === 35
			|| e.keyCode === 36) {
			$scope.$broadcast('viewportChanged');
		}
	};

	$scope.keyup = function (e) {
		if (e.keyCode === 16) {
			$scope.keyboard.isShiftDown = false;
		}

		if (e.keyCode === 224 || 
			e.keyCode === 17 || 
			e.keyCode === 91 || 
			e.keyCode === 93) {
			$scope.keyboard.isCommandDown = false;
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
		$scope.$broadcast("circleChanged", circle._id);
		if (refreshPage) {
			$window.location.href = "/#/";
		}
	};

	$scope.isCurrentPath = function (val) {
		var pathname = $window.location.pathname;
		if (pathname.indexOf(val) >= 0) {
			return true;
		}

		var path = $location.path();
		if (!path) {
			return false;
		}

		return path === val || (path.indexOf(val) === 0);
	};

	var getActiveCircle = function () {
		var activeCircle = undefined;
		angular.forEach(session.circleList, function (circle) {
			if (circle.id === session.activeCircle) {
				activeCircle = circle;
			}
		});
		return activeCircle;
	};
	$scope.getActiveCircle = getActiveCircle;

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

		var activeCircle = getActiveCircle();
		if (activeCircle) {
			return activeCircle.name;
		}
	};

	$scope.getActiveCircleColors = function () {
		var activeCircle = getActiveCircle();
		if (activeCircle) {
			return activeCircle.colors;
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
			$window.location.href = "/signin";
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

		$scope.$on('storyBlockMoved', function () {
			analytics.trackEvent('story', 'block moved');
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

	$scope.isPagePublic = function (path) {
		if (path === '/docs'
			|| path === '/tips'
			|| path === '/tour'
			|| path.indexOf('/tour') === 0
			|| path === '/partner'
			|| path === '/donate'
			|| path === '/about'
			|| path === '/contact'
			|| path === '/privacy'
			|| path === '/invite'
			|| path.indexOf('/invite') === 0) {
			return true;
		}

		return false;
	};

	var initSocketIO = function () {
		if (typeof(io) !== 'undefined') {
			var socket = io();

			socket.on('o', function () {
				$scope.$broadcast('o');
			});

			socket.on('story-save', function (data) {
				$scope.$broadcast('ioStory', data);
			});

			socket.on('story-move-block', function (data) {
				$scope.$broadcast('ioMoveBlock', data);
			});

			socket.on('story-add', function (data) {
				$scope.$broadcast('ioStoryAdded', data);
			});

			socket.on('story-remove', function (data) {
				$scope.$broadcast('ioStoryRemoved', data);
			});

			socket.on('story-highlighted', function (data) {
				$scope.$broadcast('ioStoryHighlighted', data);
			});

			socket.on('connect', function (data) {
				socket.emit('join-circle', { circle: session.activeCircle });
			});

			socket.on('disconnect', function (data) {
				console.log("IO DISCONNECT")
				console.log(data)
				// TODO: Refresh our data when we reconnect?
			});

			$scope.$on('storyHighlighted', function (e, story) {
				socket.emit('story-highlighted', {
					circle: story.projectId,
					storyId: story.id
				});
			});

			io.connect();

		}
	}(); // closure

	var init = function() {
		if ($window.location.hash.length === 0) {
			analytics.trackPage();

			var locationPath = $window.location.pathname;
			// Don't save these paths
			if (locationPath.indexOf('/signin') !== 0 && 
				locationPath.indexOf('/invite') !== 0) {
				// Save all other paths for redirecting back 
				// to them after signing in.
				session.lastLocationPath = locationPath;
				session.save();
			}	
		}

		$scope.$on('$routeChangeSuccess', function () {
			$scope.isHeaderVisible = true;
			var path = $location.path();
			if (path === '/initialize') {
				return;
			}
			// Don't save /signin or /invite paths
			if (path.indexOf('/signin') !== 0 && path.indexOf('/invite') !== 0) {
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
								name: memberships[key].circleName,
								colors: memberships[key].circleColors,
								isArchived: memberships[key].circleIsArchived
							};
						}
					}

					// Sort the circle list by name
					var circleArray = [];
					for (var key in circleList) {
						var circle = circleList[key];
						circleArray.push(circle);
					}
					circleArray.sort(function (a, b) {
						if (a.name < b.name) {
							return -1;
						}
						if (a.name > b.name) {
							return 1;
						}
						return 0;
					});

					session.circleList = circleArray;
				}(); // closure
				
				session.save();
			})
			.error(function (data, status, headers, config) {
				if (status === 401) {
					// TODO: This is not cool.
					if ($scope.isPagePublic(path)) {
						// We're fine. 
					}
					else {
						// We need to be signed in to access
						// whatever page we're at, but we're
						// not, so redirect to the signin page.
						$scope.signOut();
					}
				}
				else {
					// Either the server timed out or something bad.
					// Either way, we don't know who is signed in.
					// However, if we get here, there will likely
					// be a bunch of other errors in the system, so
					// let them be handled elsewhere.
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
TopLevelCtrl.$inject = ['session', 'lib', '$scope', '$http', '$location', '$route', '$window', '$timeout', 'analytics'];