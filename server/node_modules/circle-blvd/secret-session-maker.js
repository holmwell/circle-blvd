var database = require('./data/sessions/session-database.js');
var uuid = require('node-uuid');
var members = require('./data/users.js');

module.exports = function () {
    var docType = "secret-session";

    var create = function (member, callback) {
        var secret = uuid.v4();

        // Expires in an hour
        var expires = new Date();
        expires.setHours(expires.getHours() + 1);

        var doc = {
            secret: secret,
            user: member.id,
            expires: expires,
            type: docType
        };

        database.insert(doc, function (err, body) {
            if (err) {
                return callback(err);
            }
            database.get(body.id, function (err, doc) {
                if (err) {
                    return callback(err);
                }
                callback(null, doc);
            });
        });
    };

    var find = function (id, callback) {
        database.get(id, function (err, doc) {
            if (err) {
                if (err.status_code === 404) {
                    // Not found.
                    return callback();
                }
                return callback(err);
            }

            var now = new Date();
            var expires = Date.parse(doc.expires);
            
            if (doc.type === docType && now < expires) {
                callback(null, doc);
            }
            else {
                // Not found.
                callback();
            }
        });
    };

    return {
        create: create,
        find: find
    }
}();