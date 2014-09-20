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

    couch.db.insert(invite, function (err, successDoc) {
        if (err) {
            callback(err);
            return;
        }
        invite._id = successDoc.id;
        invite._rev = successDoc.rev;
        callback(null, invite);
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

        callback(doc);
    });
};

exports.create = create;
exports.get = get;