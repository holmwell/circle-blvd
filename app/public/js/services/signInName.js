CircleBlvd.Services.signInName = function () {
	var storageKey = 'signInName';

	// TODO: We'll want to expire this.
	return {
		get: function () {
			return store.get(storageKey);
		}, 
		set: function (value) {
			store.set(storageKey, value);
		}
	};
};