var couch = require('./couch.js');

var data = {};
data.archives = require('./data-archives.js');
data.circles  = require('./data-circles.js');
data.groups   = require('./data-groups.js');
data.settings = require('./data-settings.js');
data.stories  = require('./data-stories.js');
data.users    = require('./data-users.js');

var db = function() {

	return {
		archives: data.archives,
		circles: data.circles,
		docs: {
			get: function(docId, callback) {
				couch.docs.get(docId, callback);
			}
		},
		groups: data.groups,
		settings: data.settings,
		stories: data.stories,
		whenReady: couch.database.whenReady,
		users: data.users
	};
}();


exports.instance = function() {
	return db;
};
