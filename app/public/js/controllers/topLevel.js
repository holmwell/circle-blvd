'use strict';

function TopLevelCtrl(session, $scope, $http) {

	$scope.isSignedIn = function() {
		if (session && session.user && session.user.email) {
			return true;
		}

		return false;
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
	};

	init();
}
TopLevelCtrl.$inject = ['session', '$scope', '$http'];