// Routes for groups ... which are not really 
// implemented at this point.
//
// /data/group

var express = require('express');
var router = express.Router();

var ensure = require('circle-blvd/auth-ensure');
var handle = require('circle-blvd/handle');

module.exports = function (db) {
    // TODO: We'll turn groups on at a later time, as we
    // transition toward hosting larger groups, but in the 
    // mean time this is just a security hole.
    //
    // TODO: Ensure circle access
    // app.post("/data/group", ensureAdministrator, function (req, res) {
    //  var data = req.body;

    //  var group = {}; 
    //  group.projectId = data.projectId;
    //  group.name = data.name;

    //  db.groups.add(group, handle(res));
    // });

    // // TODO: Ensure circle access
    router.get("/:groupId", ensure.auth, function (req, res) {
        var groupId = req.params.groupId;
        db.groups.findById(groupId, handle(res));
    });

    // // TODO: Ensure circle access
    // app.put("/data/group/remove", ensureAdministrator, function (req, res) {
    //  var group = req.body;

    //  db.groups.remove(group, 
    //      function () {
    //          res.status(200).send();
    //      },
    //      function (err) {
    //          errors.handle(err, res);
    //      }
    //  );
    // });
    return {
        router: router
    };
};