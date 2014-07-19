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

	var saveSetting = function(setting, success, failure) {
		couch.settings.update(setting, function (err, newSetting) {
			if (err) {
				return failure(err);
			}
			return success(newSetting);
		});
	};

	// TODO: Refactor, get rid of the save setting stuff.
	var updateSetting = function (setting, callback) {
		saveSetting(setting, 
			function success (newSetting) {
				callback(null, newSetting);
			},
			function failure (err) {
				callback(err);
			}
		);
	};

	return {
		add: addSetting,
		get: couch.settings.get,
		getAuthorized: couch.settings.getAuthorized,
		getPrivate: couch.settings.getPrivate,
		getAll: couch.settings.getAll,
		update: updateSetting
	};
}(); // closure