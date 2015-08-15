'use strict';

function PartnerCtrl(session, $scope, $http) {

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

	updateScope();
}
PartnerCtrl.$inject = ['session', '$scope', '$http'];