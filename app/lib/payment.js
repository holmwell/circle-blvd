// payment.js

var stripeProcessor = require('stripe');
var stripe = undefined;

module.exports = function () {
	
	var setApiKey = function (secretKey) {
		stripe = stripeProcessor(secretKey);
	};

	return {
		setApiKey: setApiKey,
		stripe: stripe
	};
}(); // closure