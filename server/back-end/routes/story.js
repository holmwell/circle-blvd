// Routes for stories
// /data/story

var express = require('express');
var router = express.Router();

var db = require('circle-blvd/dataAccess').instance();
var errors = require('circle-blvd/errors');
var ensure = require('circle-blvd/auth-ensure');

var guard = errors.guard;
var handle = require('circle-blvd/handle');
var limits = require('circle-blvd/limits');
var notify = require('circle-blvd/notify');

var copyStory = function (story) {
    var copy = {};
    
    copy.projectId = story.projectId;
    copy.listId = story.listId;
    
    copy.summary = story.summary;
    copy.description = story.description;
    copy.owner = story.owner;
    copy.status = story.status;
    copy.labels = story.labels;

    copy.isDeadline = story.isDeadline;
    copy.isNextMeeting = story.isNextMeeting;

    copy.createdBy = story.createdBy;
    copy.nextId = story.nextId;

    return copy;
};

var ioNotify = function (res, circleId, type, data) {
    if (!res.circleBlvd) {
        res.circleBlvd = {};
    }
    res.circleBlvd.notifyCircle = circleId;
    res.circleBlvd.notifyType = type;
    res.circleBlvd.notifyData = data;
};

var addStory = function (story, res) {
    ioNotify(res, story.projectId, 'story-add', story);
    db.stories.add(story, handle(res));
};

var getCreatedBy = function (req) {
    var createdBy = undefined;
    if (req.user) {
        createdBy = {
            name: req.user.name,
            id: req.user._id
        };
    }

    return createdBy;
};

// TODO: Ensure that the circleId specified in this
// story is valid. Otherwise people can hack around
// ways of accessing stories.
//
// This might be a thing to do at the data layer, or
// we could do it higher up by getting the story
// from the database and comparing the projectId to
// the one specified, which might be a cleaner approach.
router.post("/", ensure.auth, function (req, res) {
    var data = req.body;
    var circleId = data.projectId;

    ensure.isCircle(circleId, req, res, function() {
        // Add the story if we're under the server limit.
        limits.users.story(circleId, guard(res, function () {
            // Add the story if the circle is paid for.
            db.circles.isCircleInGoodStanding(circleId, guard(res, function (isCircleInGoodStanding) {
                if (isCircleInGoodStanding) {
                    var story = copyStory(data);
                    story.createdBy = getCreatedBy(req);
                    addStory(story, res);
                }
                else {
                    res.status(402).send("Subscription required.");
                }
            }));
        }));
    });
});

var getComment = function (text, req) {
    var comment = {
        text: text,
        createdBy: getCreatedBy(req),
        timestamp: Date.now()
    };

    return comment;
};

var saveStoryWithComment = function (story, req, res) {
    ioNotify(res, story.projectId, 'story-save', story);
    db.stories.save(story, 
        function (savedStory) {
            if (story.newComment) {
                var params = {
                    story: savedStory,
                    comment: story.newComment,
                    user: req.user
                };
                notify.newComment(params, req); 
            }
            res.status(200).send(savedStory);
        },
        function (err) {
            errors.handle(err, res);
        }
    );
};

router.put("/", ensure.auth, function (req, res) {
    var story = req.body;
    var commentText = undefined;
    ensure.isCircle(story.projectId, req, res, function () {
        // TODO: This is an opportunity to clean up the API?
        // In other words, add /data/story/comment? Maybe.
        if (story.newComment) {
            story.newComment = getComment(story.newComment, req);
        }
        saveStoryWithComment(story, req, res);
    }); 
});

router.put("/comment", ensure.auth, function (req, res) {
    // circleId, storyId, comment
    var data = req.body;
    if (!data.circleId || !data.storyId || !data.comment) {
        return res.status(400).send("Missing circleId, storyId or comment.");
    }

    ensure.isCircle(data.circleId, req, res, function () {
        db.docs.get(data.storyId, guard(res, function (story) {
            if (story.projectId !== data.circleId) {
                return res.status(400).send();
            }

            story.newComment = getComment(data.comment, req);
            saveStoryWithComment(story, req, res);
        }));
    });
});

router.get("/:storyId", ensure.auth, function (req, res) {
    var storyId = req.params.storyId;
    if (!storyId) {
        return res.status(400).send("Story id required.");
    }

    db.docs.get(storyId, guard(res, function (story) {
        if (!story || story.type !== "story") {
            return res.status(400).send("Story not found");
        }

        var circleId = story.projectId;
        ensure.isCircle(circleId, req, res, function () {
            res.status(200).send(story);
        });
    }));
});

router.put("/fix", ensure.auth, function (req, res) {
    var body = req.body;
    var story = body.story;
    var newNextId = body.newNextId;
    ensure.isCircle(story.projectId, req, res, function () {
        story.nextId = newNextId;
        db.stories.fix(story, function (response) {
            res.status(200).send(response);
        },
        function (err) {
            errors.handle(err, res);
        });
    });
});

router.put("/move", ensure.auth, function (req, res) {
    var body = req.body;
    var story = body.story;
    var newNextId = body.newNextId;
    ensure.isCircle(story.projectId, req, res, function () {
        ioNotify(res, story.projectId, 'story-move-block', {
            startStoryId: story.id,
            endStoryId: story.id,
            newNextId: newNextId
        });
        db.stories.move(story, newNextId, handle(res));
    });
});

router.put("/move-block", ensure.auth, function (req, res) {
    var body = req.body;

    var startStory = body.startStory;
    var endStory = body.endStory;
    var newNextId = body.newNextId;

    ensure.isCircle(startStory.projectId, req, res, function () {
        ensure.isCircle(endStory.projectId, req, res, function () {
            ioNotify(res, startStory.projectId, 'story-move-block', {
                startStoryId: startStory.id,
                endStoryId: endStory.id,
                newNextId: newNextId
            });
            db.stories.moveBlock(startStory, endStory, newNextId, handle(res));
        });
    });
});

var removeStory = function (story, res) {
    // FYI: This happens for both deleted stories and archived
    // stories. We might want to distinguish between the two.
    ioNotify(res, story.projectId, 'story-remove', story);
    db.stories.remove(story, handle(res));
};

router.put("/archive", ensure.auth, function (req, res) {
    var story = req.body;
    ensure.isCircle(story.projectId, req, res, function () {
        limits.archives(story.projectId, guard(res, function () {
            var stories = [];
            stories.push(story);

            db.archives.addStories(stories, 
            function (body) {
                // TODO: If this breaks then we have a data
                // integrity issue, because we have an archive
                // of a story that has not been deleted.
                removeStory(story, res);
            }, 
            function (err) {
                errors.handle(err, res);
            });
        }));
    });
});

router.put("/remove", ensure.auth, function (req, res) {
    var story = req.body;
    ensure.isCircle(story.projectId, req, res, function () {
        removeStory(story, res);
    });
});


router.post("/notify/new", ensure.auth, function (req, res) {
    var story = req.body;
    var sender = req.user;
    ensure.isCircle(story.projectId, req, res, function () {
        notify.newStory(story, sender, req, handle(res));
    });
});

module.exports = function () {
    return {
        router: function (a) {
            app = a;
            return router;
        },
        // addStory and removeStory are used by the 
        // setting that adds / removes the next meeting,
        // but that's it.
        addStory: addStory,
        removeStory: removeStory
    }
}(); // closure