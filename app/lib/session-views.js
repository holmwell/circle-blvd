// session-views.js
//
// The design docs for circle-blvd-sessions.
//
var nanoViews = require("./nano-views.js");

var sessionsDesignDoc = {
	url: '_design/sessions',
	body: 
	{
		version: "1.0.2",
		language: "javascript",
		views: {
			byExpires: {
				map: function (doc) {
					if (doc.session 
						&& doc.session.cookie 
						&& doc.session.cookie.expires) {
						emit(doc.session.cookie.expires, doc._rev);
					}
				}
			}
		}
	}
};
nanoViews.add(sessionsDesignDoc);

var createViews = function (database, callback) {
	nanoViews.saveToDatabase(database, callback);
};

exports.create = createViews;