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

	return {
		setApiKey: setApiKey,
		stripe: getStripe
	};
};