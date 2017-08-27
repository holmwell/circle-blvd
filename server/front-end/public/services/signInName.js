CircleBlvd.Services.signInName = function () {
	var storageKey = 'signInName';

	// TODO: We'll want to expire this.
	return {
		get: function () {
			return store.get(storageKey);
		}, 
		set: function (value) {
			if (store.enabled) {
				store.set(storageKey, value);
			}
		}
	};
};

angular.module('CircleBlvd.services')
.factory('signInName', CircleBlvd.Services.signInName);