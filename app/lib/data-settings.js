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

	var getSettingsView = function (name, callback) {
		return couch.settings.getView(name, callback);
	}

	var getSettings = function (callback) {
		getSettingsView("public", callback);
	};

	var getAuthorizedSettings = function (callback) {
		getSettingsView("authorized", callback);
	};

	var getPrivateSettings = function (callback) {
		getSettingsView("private", callback);
	};

	var getAllSettings = function (callback) {
		getSettingsView("all", callback);
	};

	return {
		add: addSetting,
		get: getSettings,
		getAuthorized: getAuthorizedSettings,
		getPrivate: getPrivateSettings,
		getAll: getAllSettings,
		update: couch.settings.update
	};
}(); // closure