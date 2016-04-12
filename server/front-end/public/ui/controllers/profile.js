'use strict';

function ProfileCtrl(session, $scope, $http, errors) {
	var messages = {};
	var feedback = {};

	$scope.messages = messages;
	$scope.feedback = feedback;

	$scope.supportsPayments = false;
	$scope.activePlan = {};

	if ($scope.showBackBar) {
		$scope.showBackBar();
	}

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

	var updateCircles = function () {
		$http.get("/data/circles")
		.success(function (data) {
			var rawCircleData = data;
			var circles = {};
			// TODO: Need to change the view to remove duplicates,
			// as data.length === memberships.length, rather than
			// circle length.
			rawCircleData.forEach(function (circle) {
				circles[circle._id] = circle;
			});
			$scope.circles = circles;
		})
		.error(function (data, status) {
			errors.log(data, status);
		});
	};

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

			updateCircles();
		}
	};

	var saveUserProperty = function (propName, val, callback) {
		var data = {};
		data.id = session.user.id;
		data[propName] = val;

		$http.put('/data/user/' + propName, data)
		.success(function () {
			feedback[propName] = "success";
			messages[propName] = null;

			if (callback) {
				callback();
			}
		})
		.error(function (data, status) {
			feedback[propName] = "error";
			messages[propName] = data;
			
			var err = {
				data: data,
				status: status
			}

			if (callback) {
				callback(err);
			}
		});
	};

	var updateName = function (name) {
		saveUserProperty("name", name, function (err) {
			if (err) {
				return;
			}
			session.user.name = name;
			session.save();
		});
	};

	var updateEmail = function (email) {
		saveUserProperty("email", email, function (err) {
			if (err) {
				return;
			}
			session.user.email = email;
			session.save();
		});
	};

	var updateNotificationEmail = function (address) {
		if (!address) {
			feedback.notificationEmail = "error";
			messages.notificationEmail = "Sorry, we'd like an email address."
			return;
		}

		saveUserProperty("notificationEmail", address, function (err) {
			if (err) {
				return;
			}
			session.user.notifications = session.user.notifications || {};
			session.user.notifications.email = address;
			session.save();
		});
	};

	$scope.saveProfile = function (name, email, notificationEmail) {
		updateName(name);
		updateEmail(email);
		updateNotificationEmail(notificationEmail);
	};

	$scope.isCreatingCircle = false;
	$scope.createCircle = function (circleName) {
		if (!circleName || $scope.isCreatingCircle) {
			return;
		}
		$scope.isCreatingCircle = true;

		var finishUp = function () {
			$scope.newCircleName = undefined;
			$scope.isCreatingCircle = false;
		};

		var data = {};
		data.name = circleName;
		$http.post("/data/circle/", data)
		.success(function () {
			messages.circle = "Circle created.";
			finishUp();
			updateCircles();
		})
		.error(function (data, status) {
			finishUp();
			if (status === 403) {
				messages.circle = data;
				return;
			}
			errors.handle(data, status);
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
				 " (" + 
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

	$scope.isSuccess = function (val) {
		return val === "success";
	};

	$scope.isError = function (val) {
		return val === "failure";
	};
	
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