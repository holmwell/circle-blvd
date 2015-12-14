var couch = require('./couch/couch.js');

module.exports = function () {
	return {
		get: function(docId, callback) {
			couch.docs.get(docId, callback);
		}
	};
}(); // closure