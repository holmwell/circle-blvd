var async = require('async');
var nano = require('nano')('http://localhost:5984');
var request = require('supertest');

var databaseName = 'a-tmp-db-for-circle-blvd-testing';
var sessionsDatabaseName = databaseName + '-sessions';
process.env.DATABASE_NAME = databaseName;

var unit  = undefined;
var test  = {};

var admin = undefined;
var member = undefined;

var adminEmail = 'admin@test';
var adminPassword = 'Well, what do you think?';
var adminSession = {};

var memberEmail = "member@test";
var memberPassword = 'Members only!';
var memberSession = {};

var finish = function (test) {
    var fn = function (err) {
        test.ifError(err);
        test.done();
    };
    return fn;
};

test['database setup'] = function (test) {
    var app = require('../app.js');
    unit = app.express;
    // CouchDB is not entirely ready when ready is
    // called. So, work around that until we can
    // fix it.
    var halfSecond = 500;
    app.init();
    app.whenReady(function () {
        setTimeout(function () {
            test.done();
        }, halfSecond); 
    });

    // for a persistent session
    admin = request.agent(unit);
    member = request.agent(unit);
};

test['POST /data/initialize is 200'] = function (test) {
    var data = {};
    data.admin = {
        email: adminEmail,
        password: adminPassword
    };

    request(unit)
    .put('/data/initialize')
    .send(data)
    .expect(200)
    .end(finish(test));
};

test['POST /auth/signin is 200'] = function (test) {
    admin
    .post('/auth/signin')
    .type("form")
    .send({ email: adminEmail })
    .send({ password: adminPassword })
    .expect(200)
    .end(finish(test));
};

// Create circle
test['POST /data/circle is 200'] = function (test) {
    var data = {
        name: "Test circle"
    };
    admin.post('/data/circle')
    .send(data)
    .expect(200)
    .expect(function (res) {
        var circle = res.body;
        adminSession.circle = circle;
        test.ok(circle._id, "circle id");
    })
    .end(finish(test));
};


// Add story
test['POST /data/story/ is 200'] = function (test) {
    var story = {
        summary: "A test story",
        projectId: adminSession.circle._id
    };

    admin
    .post('/data/story/')
    .send(story)
    .expect(200)
    .end(function (err, res) {
        test.ifError(err);
        adminSession.story = res.body;
        test.equal(adminSession.story.summary, story.summary);
        test.done();
    });
};

test['Can create 25 stories quickly.'] = function (test) {

    var totalStories = 25;
    var completedStories = 0;
    var maybeDone = function () {
        completedStories++;
        if (completedStories === totalStories) {
            admin.get('/data/' + adminSession.circle._id + '/stories')
            .expect(200)
            .expect(function (res) {
                var stories = res.body;
                adminSession.stories = stories;
                var storyCountInDb = 0;
                var firstStory = undefined;
                for (var key in stories) {
                    storyCountInDb++;
                    if (stories[key].isFirstStory) {
                        firstStory = stories[key];
                    }
                }

                var expectedCount = totalStories + initialStoryCount;
                test.equal(expectedCount, storyCountInDb, "All stories not added");

                var storyList = [];
                var currentStory = firstStory;
                while (currentStory) {
                    storyList.push(currentStory);
                    currentStory = stories[currentStory.nextId];    
                }

                storyCountInDb = storyList.length;
                expectedCount = totalStories + initialStoryCount;
                test.equal(expectedCount, storyCountInDb, "isFirstStory not correct");
            })
            .end(finish(test));
        }
    };

    // Note, by adding stories this way, we can't really 
    // test the order, as they arrive at the server in
    // an undetermined order, as it stands. 
    var addStories = function () {
        for (var i=0; i < totalStories; i++) {
            var story = {
                summary: "" + i,
                projectId: adminSession.circle._id
            };

            admin
            .post('/data/story/')
            .send(story)
            .expect(200)
            .end(function (err, res) {
                test.ifError(err);
                adminSession.story = res.body;
                maybeDone();
            });        
        }
    };

    // Get initial story count before running test.
    admin.get('/data/' + adminSession.circle._id + '/stories')
        .expect(200)
        .expect(function (res) {
            var stories = res.body;
            var storyCount = 0;
            for (var key in stories) {
                storyCount++;
            }
            initialStoryCount = storyCount;
        })
        .end(addStories);
};

test['database tear down'] = function (test) {
    var destroyTestDatabase = function (callback) {
        nano.db.destroy(databaseName, callback);
    };
    var destroyTestSessionsDb = function (callback) {
        nano.db.destroy(sessionsDatabaseName, callback);
    };

    var destroy = [destroyTestDatabase, destroyTestSessionsDb];
    async.series(destroy, function (err, results) {
        test.ifError(err);
        test.done();
    });
};

exports[''] = test;