// Routes for fundamental circle operations
// /data ...

var express = require('express');
var router = express.Router();

var db = require('circle-blvd/dataAccess');
var errors = require('circle-blvd/errors');
var ensure = require('circle-blvd/auth-ensure');

var guard = errors.guard;
var handle = require('circle-blvd/handle');
var limits = require('circle-blvd/limits');


// Story routes
router.get("/:circleId/stories", ensure.circle, function (req, res) {
    var circleId = req.params.circleId;
    db.stories.findByListId(circleId, handle(res));
});

// TODO: combine this with /stories to return one object with 
// both the story list and the first story (in two different things)
router.get("/:circleId/first-story", ensure.circle, function (req, res) {
    var circleId = req.params.circleId;
    db.stories.getFirstByProjectId(circleId, handle(res));
});

router.get("/:circleId/archives", ensure.circle, function (req, res) {
    var circleId = req.params.circleId;
    var query = req.query;
    var defaultLimit = 251; // TODO: Settings

    var limit = query.limit || defaultLimit;
    var startkey = query.startkey;
    var params = {
        limit: limit,
        startkey: startkey
    };

    db.archives.findByCircleId(circleId, params, handle(res));
});

router.get("/:circleId/archives/count", ensure.circle, function (req, res) {
    var circleId = req.params.circleId;
    db.archives.countByCircleId(circleId, guard(res, function (count) {
        res.status(200).send(count.toString());
    }));
});


// Circle members (task owners)
router.get("/:circleId/members/names", ensure.circle, function (req, res) {
    var circleId = req.params.circleId;
    db.users.findNamesByCircleId(circleId, handle(res));
});


// Checklists!
router.post("/:circleId/list", ensure.circle, function (req, res) {
    var list = {
        name: req.body.name,
        description: req.body.description,
        circleId: req.params.circleId
    };

    limits.lists(list.circleId, guard(res, function () {
        db.lists.add(list, handle(res));    
    }));
});

router.get("/:circleId/lists", ensure.circle, function (req, res) {
    var circleId = req.params.circleId;
    db.lists.byCircleId(circleId, handle(res));
});

router.get("/:circleId/:listId/stories", ensure.circle, function (req, res) {
    var circleId = req.params.circleId;
    var listId = req.params.listId;
    db.stories.findByListId(listId, handle(res));
});

router.get("/:circleId/:listId/first-story", ensure.circle, function (req, res) {
    var listId = req.params.listId;
    db.stories.getFirstByProjectId(listId, handle(res));
});


// Groups!
router.get("/:circleId/groups", ensure.circle, function (req, res) {
    var circleId = req.params.circleId;
    db.groups.findByProjectId(circleId, handle(res));
});

module.exports.router = router;