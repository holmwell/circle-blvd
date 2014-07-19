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

	var handleNewDemoSetting = function (newValue, success, failure) {
		// TODO: This should probably be in a different place, like
		// a settings-specific file.
		var demoEmail = "demo@circleblvd.org";
		if (newValue) {
			// Demo mode is turned on!
			// name, email, password, memberships, isReadOnly, success, failure
			addUser("Public Demo", demoEmail, "public", [], true, success, failure);
		}
		else {
			// Demo mode is turned off!
			findUserByEmail(demoEmail, function (err, user) {
				if (err) {
					return failure(err);
				}
				removeUser(user, success, failure);
			});
		}
	};

	var saveSetting = function(setting, success, failure) {
		couch.settings.update(setting, function (err, newSetting) {
			if (err) {
				return failure(err);
			}

			if (newSetting.name === "demo") {
				// TODO: The transactional nature of this code
				// has the potential to break things, but they 
				// can probably be fixed through the admin panel.
				return handleNewDemoSetting(newSetting.value, 
					function() {
						success(setting);
					},
					failure);
			}
			else {
				return success(newSetting);
			}
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