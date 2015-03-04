var waitlist = require('./couch/waitlist.js');

module.exports = function () {
	return {
		add: waitlist.add,
		get: waitlist.get
	};
}(); // closure