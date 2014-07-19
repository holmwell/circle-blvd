// payment.js
var db = require('./dataAccess.js').instance();

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

	var cancelSubscription = function (user, callback) {
		// Just delete the Stripe customer, since they
		// only have one subscription anyway.
		var customerId = user.subscription.customerId;
		stripe.customers.del(customerId, function (err, confirm) {
			if (err) {
				return callback(err);
			}

			var onSuccess = function (updatedUser) {
				callback(null, updatedUser.subscription);
			};
			var onError = function (err) {
				// TODO: Technically it's possible to update
				// the Stripe data and not update our own 
				// data, so we should have a fall-back plan
				// if that happens.
				callback(err);
			};

			user.subscription = null;
			// TODO: Is this a security hole, updating the
			// entire user like so? It is certainly large and 
			// clumsy.
			db.users.update(user, onSuccess, onError);
		});
	};

	return {
		createDonation: createDonation,
		cancelSubscription: cancelSubscription,
		setApiKey: setApiKey,
		stripe: getStripe
	};
};