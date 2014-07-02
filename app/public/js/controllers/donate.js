function DonateCtrl(session, $scope, $http, errors) {

	$scope.donation = {
		displayAmount: "$20.00",
		stripeAmount: 2000
	};

	var stripeKey = session.settings['stripe-public-key'].value;
	if (stripeKey) {
		$scope.supportsPayments = true;

		var stripeHandler = StripeCheckout.configure({
			key: stripeKey,
			image: '/img/logo-on-black-128px.png',
			token: function (token, args) {
				var donation = $scope.donation;
				var data = {};

				data.stripeTokenId = token.id;
				data.stripeAmount = donation.stripeAmount;
				$http.post('/payment/donate', data)
				.success(function (data) {
					$scope.isDonationSuccess = true;
				})
				.error(function (data, status) {
					errors.handle(data, status);
				});
			}
		});

		$scope.openStripeCheckout = function (e) {
			var donation = $scope.donation;
			
			stripeHandler.open({
				name: 'Circle Blvd.',
				description: "One-time donation" +
				 " (" + donation.displayAmount + ")",
				amount: donation.stripeAmount,
				panelLabel: "Donate {{amount}}",
				allowRememberMe: false
			});
			e.stopPropagation();
		};	
	}

}
DonateCtrl.$inject = ['session', '$scope', '$http', 'errors'];