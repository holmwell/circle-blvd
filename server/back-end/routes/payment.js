// Routes for subscriptions and donations.

var express = require('express');
var router = express.Router();

var ensure = require('circle-blvd/auth-ensure');
var handle = require('circle-blvd/handle');

module.exports = function (payment) {
    router.post('/donate', function (req, res) {
        var data = req.body;
        var stripeTokenId = data.stripeTokenId;
        var amount = data.stripeAmount;

        payment.donate(stripeTokenId, amount, handle(res));
    });

    router.post('/subscribe', ensure.auth, function (req, res) {
        var data = req.body;

        var user = req.user;
        var stripeTokenId = data.stripeTokenId;
        var planName = data.planName;

        payment.subscribe(user, stripeTokenId, planName, handle(res));
    });

    router.put('/subscribe/cancel', ensure.auth, function (req, res) {
        var user = req.user;
        if (!user.subscription) {
            return res.status(204).send();
        }

        payment.unsubscribe(user, handle(res));
    });

    return {
        router: router
    };
};
