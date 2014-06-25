'use strict';

function ProfileCtrl(session, $scope, $http, errors) {
	$scope.supportsPayments = false;
	$scope.activePlan = {};

	var plans = [];
	plans.push({
		name: "Supporter",
		displayAmount: "$5",
		stripeAmount: 500
	});
	plans.push({
		name: "Organizer",
		displayAmount: "$20",
		stripeAmount: 2000
	});
	plans.push({
		name: "Patron",
		displayAmount: "$100",
		stripeAmount: 10000
	});

	var updateScope = function () {
		if (session.user) {
			$scope.name = session.user.name;
			$scope.email = session.user.email;
			if (session.user.notifications && session.user.notifications.email) {
				$scope.notificationEmail = session.user.notifications.email;
			}
			else {
				$scope.notificationEmail = session.user.email;	
			}

			// Load the saved subscription if there is one
			if (session.user.subscription) {
				var savedPlanName = session.user.subscription.planName;
				angular.forEach(plans, function (plan) {
					if (plan.name === savedPlanName) {
						$scope.activePlan = plan;
					}
				});
			}
			else {
				$scope.activePlan = {};
			}
		}
	};

	var messages = {};
	$scope.messages = messages;

	var saveUser = function (user, callback) {
		$http.put('/data/user', user)
		.success(function() {
			session.user = user;
			session.save();

			if (callback) {
				callback();
			}
		})
		.error(function (data, status) {
			errors.handle(data, status);
		});
	};

	$scope.updateUser = function (name, email) {
		var data = session.user;
		data.name = name;
		data.email = email;

		saveUser(data, function () {
			messages.user = "Profile updated."
		});
	};

	$scope.updateNotificationEmail = function (address) {
		if (!address) {
			messages.notificationEmail = "Sorry, we'd like an email address."
			return;
		}
		var data = session.user;
		data.notifications = session.user.notifications || {};
		data.notifications.email = address;

		saveUser(data, function () {
			messages.notificationEmail = "Address updated.";
		});
	};

	$scope.updatePassword = function (pass1, pass2) {
		if (pass1 !== pass2) {
			messages.password = "Sorry, your passwords don't match."
			return;
		}

		var data = {};
		data.password = pass1;

		$http.put('/data/user/password', data)
		.success(function() {
			messages.password = "Password updated.";
		})
		.error(function (data, status) {
			errors.handle(data, status);
		});
	};

	var stripeKey = session.settings['stripe-public-key'].value;
	if (stripeKey) {
		$scope.plans = plans;
		$scope.supportsPayments = true;

		var stripeHandler = StripeCheckout.configure({
			key: stripeKey,
			image: '/img/logo-on-black-128px.png',
			token: function (token, args) {
				var activePlan = $scope.activePlan;
				var data = {};

				data.stripeTokenId = token.id;
				data.planName = activePlan.name;
				$http.post('/payment/subscribe', data)

				.success(function (data) {
					session.user.subscription = data;
					session.save();
				})
				.error(function (data, status) {
					errors.handle(data, status);
				});
			}
		});

		$scope.openStripeCheckout = function (e) {
			var activePlan = $scope.activePlan;
			if (!activePlan.name) {
				return;
			}
			stripeHandler.open({
				name: 'Circle Blvd.',
				description: activePlan.name +
				 " subscription (" + 
				 	activePlan.displayAmount +
				 	 " per month)",
				amount: activePlan.stripeAmount,
				panelLabel: "Pay {{amount}} per month",
				email: session.user.email,
				allowRememberMe: false
			});
			e.stopPropagation();
		};	

		$scope.setPlan = function (plan) {
			$scope.activePlan = plan;
		};

		$scope.cancelSubscription = function () {
			var data = {};
			$http.put('/payment/subscribe/cancel', data)
			.success(function (data) {
				session.user.subscription = data;
				session.save();
				updateScope();
			})
			.error(function (data, status) {
				errors.handle(data, status);
			});
		};
	}
	
	// Get our data as a check to see if we should even be here.
	$http.get('/data/user')
	.success(function (data) {
		if (session.user.id !== data.id) {
			$scope.signOut();
			// "Sorry, we thought you were someone else for a second. Please sign in again."
		}
		else {
			updateScope();
		}
	})
	.error(function (data, status) {
		if (status === 401 && session && session.user) {
			$scope.signOut();
			// "The server was restarted. Please sign in again."
		}
	});
}
ProfileCtrl.$inject = ['session', '$scope', '$http', 'errors'];