var couch = {};
couch.settings = require('./couch-settings.js');

module.exports = function () {
	var addSetting = function(setting, callback) {
		var newSetting = {
			name: setting.name,
			value: setting.value,
			visibility: setting.visibility || "private"
		};
		
		couch.settings.add(newSetting, callback);
	};

	return {
		add: addSetting,
		get: couch.settings.get,
		getAuthorized: couch.settings.getAuthorized,
		getPrivate: couch.settings.getPrivate,
		getAll: couch.settings.getAll,
		update: couch.settings.update
	};
}(); // closure