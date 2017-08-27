CircleBlvd.Services.session = function () {
	// session: use localStorage to maintain session
	// state across visits to the page and refreshes.

	// TODO: 'today' should be injected, if it can.
	var today = new Date();
	var sessionKey = 'session';

	var getExpirationDate = function (today) {
		// expire in 12 hours. 
		// 
		// The purpose of the session is to let us 
		// bounce around the site, and refresh the 
		// page, without worrying too much. 
		// 
		// In other words, most of the data we're
		// keeping track of in the session will 
		// be irrelevant in 12 hours, anyway.
		// 
		var expirationDate = new Date();
		expirationDate.setHours(today.getHours() + 12);
		return expirationDate;
	};

	var defaultSession = function() {
		return {
			user: {
				role: 'guest'
			}
		}
	}(); // closure

	var getSession = function() {
		// if (!store.enabled) {
		// 	return null;
		// }

		var session = store.get(sessionKey);

		if (!session) {
			return session;
		}
		// Dates are stored as strings in JSON. That's cool,
		// but we want to have actual Date objects.
		if (session.expirationDate) {
			session.expirationDate = new Date(session.expirationDate);
		}

		return session;
	};

	var session = getSession();
	if (!session || !session.expirationDate) {
		// Load the default session if we don't have
		// one in the local store 
		session = defaultSession;
	}
	else if (session.expirationDate < today) {
		// the session is expired?
		session.isExpired = true;
	}
	else {
		// There is a non-stale session in local storage,
		// so let's refresh the expiration date.
		// TODO: Is this dumb? Should there be a 
		// set time where we always clear out the
		// session data?
		session.expirationDate = getExpirationDate(today);
	}

	// Add our functions back, since JSON.stringify stripped them out.
	if (!session.save) {
		session.save = function() {
			var now = new Date();
			session.isExpired = undefined;
			session.expirationDate = getExpirationDate(now);
			//if (store.enabled) {
				store.set(sessionKey, session);
			//}
		};
	}

	return session;
};

angular.module('CircleBlvd.services')
.factory('session', CircleBlvd.Services.session);