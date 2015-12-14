// encrypt.js
//
// For computing hashes and salts 
// for saving passwords.

var CRYPTO_ALGORITHM = 'sha256';
var DIGEST_ENCODING = 'hex';

var crypto = require('crypto');
var uuid = require('node-uuid');

var hashPassword = function(password, salt) {
	var hmac = crypto.createHmac(CRYPTO_ALGORITHM, salt);
	var hash = hmac.update(password).digest(DIGEST_ENCODING);
	return hash;
};

var salt = function() {
	return uuid.v4();
};

exports.hash = hashPassword;
exports.salt = salt;