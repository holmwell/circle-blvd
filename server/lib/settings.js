// settings.js
var db    = require('./dataAccess.js').instance();
var uuid  = require('node-uuid');
var async = require('async');


module.exports = function () {
	
	var set = function (settings, fnCallback) {
		var tasks = [];
		settings.forEach(function (setting) {
			tasks.push(function (callback) {
				db.settings.update(setting, callback);				
			});
		});
		async.parallel(tasks, fnCallback);
	};

	var init = function (callback) {
		// Visibility definitions:
		//   public: visible to all
		//   private: visible to administrators
		//   secret: visible to the database and computer memory
		var settings = [{
			name: "domain-name",
			value: null,
			visibility: "public"
		},{
			name: "google-analytics",
			value: null,
			visibility: "private"
		},{
			name: "limit-circles",
			value: 300,
			visibility: "private"
		},{
			name: "limit-stories-per-circle",
			value: 1000,
			visibility: "private"
		},{
			name: "limit-archives-per-circle",
			value: 10000,
			visibility: "private"
		},{
			name: "limit-lists-per-circle",
			value: 150,
			visibility: "private"
		},{
			name: "limit-total-members",
			value: 5000,
			visibility: "private"
		},{
			name: 'session-secret',
			value: uuid.v4(),
			visibility: "secret"
		},{
			name: "contact-from-address",
			value: null,
			visibility: "private"
		},{
			name: "contact-to-address",
			value: null,
			visibility: "private"
		},{
			name: "smtp-login",
			value: null,
			visibility: "private"
		},{
			name: "smtp-password",
			value: null,
			visibility: "secret"
		},{
			name: "smtp-service",
			value: "Zoho",
			visibility: "private"
		},{ 
			name: "ssl-ca-path",
			value: null,
			visibility: "private"
		},{
			name: "ssl-cert-path",
			value: null,
			visibility: "private"
		},{
			name: "ssl-key-path",
			value: null,
			visibility: "private"
		},{
			name: "stripe-public-key",
			value: null,
			visibility: "public"
		},{
			name: "stripe-secret-key",
			value: null,
			visibility: "secret"
		}];

		var settingsTable = {};
		var initialized = {};
		settings.forEach(function (setting) {
			settingsTable[setting.name] = setting;
			initialized[setting.name] = undefined;
		});

		var callbackIfAllSettingsReady = function () {
			var isReady = true;
			for (var key in initialized) {
				if (initialized[key] === undefined) {
					isReady = false;
					break;
				}
			}

			if (isReady && callback) {
				callback(null, initialized);
			}
		};

		db.settings.getAll(function (err, savedSettings) {
			if (err) {
				return callback(err);
			}
			// var savedSetting;
			// var defaultSetting;
			var settingFound;
			var settingReady = function (setting) {
				initialized[setting.name] = setting;
				callbackIfAllSettingsReady();
			};

			for (var defaultName in settingsTable) {
				
				settingFound = false;
				for (var savedName in savedSettings) {
					if (savedName === defaultName) {
						settingFound = true;
						break;
					}
				}

				if (!settingFound) {
					var addSettingToDatabase = function (settingToAdd) {
						db.settings.add(settingToAdd, function (err, body) {
							if (err) {
								return callback({
									message: "Could not set setting: " + settingToAdd.name
								});
							}
							settingReady(settingToAdd);
						});
					}(settingsTable[defaultName]);				
				}
				else {
					settingReady(savedSettings[savedName]);
				}
			}
		});
	};

	var initWhenReady = function (callback) {
		var tenSeconds = 10000;
		db.whenReady(function () {
			init(callback);
		}, tenSeconds);
		// TODO: Do we need to wait a little bit to ensure the
		// servers are started before our thread exits?		
	};

	return {
		init: initWhenReady,
		set: set
	};
}();