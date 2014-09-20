var couch = require('./couch/couch.js');

var create = function (doc, callback) {
    var oneDay = 1000 * 60 * 60 * 24;
    var fiveDays = oneDay * 5;

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
        couch.db.insert(invite, function (err, successDoc) {
            if (err) {
                callback(err);
                return;
            }
            invite._id = successDoc.id;
            invite._rev = successDoc.rev;
            callback(null, invite);
        });
    });
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

exports.create = create;
exports.get = get;
exports.accept = accept;