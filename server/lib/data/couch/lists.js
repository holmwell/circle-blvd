var couch = require('./couch.js');
var database = couch.db;

module.exports = function () {

    var addList = function (list, callback) {
        list.type = "list";
        database.insert(list, function (err, body) {
            if (err) {
                return callback(err);
            }

            list._id = body.id;
            list._rev = body.rev;
            return callback(null, list);
        });
    };

    var byCircleId = function (circleId, callback) {
        var options = {
            key: circleId
        };
        couch.view("lists/byCircleId", options, callback);
    };

    return {
        add: addList,
        byCircleId: byCircleId
    };
}(); // closure