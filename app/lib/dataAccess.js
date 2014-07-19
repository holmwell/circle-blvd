var couch = require('./couch.js');

var data = {};
data.archives  = require('./data-archives.js');
data.circles   = require('./data-circles.js');
data.docs      = require('./data-docs.js');
data.groups    = require('./data-groups.js');
data.settings  = require('./data/settings.js');
data.stories   = require('./data-stories.js');
data.users     = require('./data-users.js');
data.waitlist  = require('./data-waitlist.js');
data.whenReady = couch.database.whenReady;

var db = function() {
	return data;
}();


exports.instance = function() {
	return db;
};
