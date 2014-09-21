var couch = require('./couch/couch.js');
var uuid = require('node-uuid');
var errors = require('../errors');

var create = function (doc, callback) {
    // If we keep making invites, maintain our
    // database to delete the expired ones.
    performMaintenance(function (err) {
        if (err) {
            errors.log(err);
            // continue ...
        }
        createInvite();
    });

    function createInvite() {
        var oneDay = 1000 * 60 * 60 * 24;
        var fiveDays = oneDay * 5;

        var inviteId = uuid.v4();
        var invite = {
            circleId: doc.circleId,
            count: doc.count,
            expires: Date.now() + fiveDays, 
            type: "invite"
        };

        couch.docs.get(doc.circleId, function (err, circle) {
            if (err) {
                callback(err);
                return;
            }

            invite.circleName = circle.name;
            couch.db.insert(invite, inviteId, function (err, successDoc) {
                if (err) {
                    callback(err);
                    return;
                }
                invite._id = successDoc.id;
                invite._rev = successDoc.rev;
                callback(null, invite);
            });
        });    
    }
};

var get = function (docId, callback) {
    couch.docs.get(docId, function (err, doc) {
        if (err) {
            callback(err);
            return;
        }

        if (doc.type !== "invite") {
            callback(null);
            return;
        }

        callback(null, doc);
    });
};

var findByCircleId = function (circleId, callback) {
    var params = {
        key: circleId
    };
    couch.view("invites/byCircleId", params, function (err, docs) {
        if (err) {
            callback(err);
            return;
        }

        // Filter by valid invites, for now.
        var now = Date.now();
        var invites = [];
        docs.forEach(function (doc) {
            if (doc.count === 0) {
                return true;
            }
            if (doc.expires < now) {
                return true;
            }
            invites.push(doc);
        });

        callback(null, invites);
    });
};

var accept = function (invite, callback) {
    if (!invite) {
        var err = new Error("No invite provided");
        err.status = 400;
        callback(err);
        return;
    }

    get(invite._id, function (err, doc) {
        if (err) {
            callback(err);
            return;
        }

        if (!doc) {
            var err = new Error("Invite not found");
            err.status = 404;
            callback(err);
            return;
        }

        if (doc.count <= 0) {
            var err = new Error("Invite not available");
            err.status = 403;
            callback(err);
            return;   
        }

        doc.count--;
        couch.db.insert(doc, function (err) {
            // TODO: Handle doc conflict, once invites
            // can be accepted multiple times.
            if (err) {
                callback(err);
                return;
            }
            callback();
        });
    });
};


var lastMainenanceDate = undefined;
var actuallyPerformMaintenance = function (callback) {
    lastMainenanceDate = new Date();

    var deleteExpiredInvites = function () {
        var earliestDate = 0;
        var endkey = Date.now();

        var options = {
            startkey: earliestDate,
            endkey: endkey
        };

        couch.db.view("invites", "byExpires", options, function (err, body) {
            if (err) {
                callback(err);
                return;
            }

            var bulkDoc = {};
            var options = {};
            bulkDoc.docs = [];

            body.rows.forEach (function (doc) {
                var deleteDoc = {
                    _id: doc.id,
                    _rev: doc.value._rev,
                    _deleted: true
                };
                bulkDoc.docs.push(deleteDoc);
            });

            couch.db.bulk(bulkDoc, options, callback);
        });
    };

    var performAllMaintenance = function () {
        deleteExpiredInvites();
        // TODO: We should do this somewhere, in general.
        // couch.db.compact();
    };

    process.nextTick(performAllMaintenance);
};

// Dates are equal if they share the same day of the year.
// We don't care about units smaller than days.
var areDatesEqual = function (date1, date2) {
    if (date1.getYear() !== date2.getYear()
    || date1.getMonth() !== date2.getMonth()
    || date1.getDay() !== date2.getDay()) {
        return false;
    }

    return true;
};

function performMaintenance(callback) {
    // actually perform maintenance if it hasn't
    // been done today, otherwise no.
    if (!lastMainenanceDate) {
        return actuallyPerformMaintenance(callback);
    }
    if (areDatesEqual(new Date(), lastMainenanceDate)) {
        // do nothing
        callback();
        return;
    }

    actuallyPerformMaintenance(callback);
};

exports.create = create;
exports.get = get;
exports.accept = accept;
exports.findByCircleId = findByCircleId;