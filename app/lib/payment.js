// payment.js

var stripeProcessor = require('stripe');
var stripe = undefined;

module.exports = function () {
	
	var setApiKey = function (secretKey) {
		stripe = stripeProcessor(secretKey);
	};

	var getStripe = function () {
		return stripe;
	}

	var createDonation = function (stripeTokenId, stripeAmount, callback) {
		var donation = {
			amount: stripeAmount,
			currency: "usd",
			card: stripeTokenId,
			description: "Donation",
			statement_description: "Donation"
		};

		stripe.charges.create(donation, callback);
	};

	return {
		createDonation: createDonation,
		setApiKey: setApiKey,
		stripe: getStripe
	};
};