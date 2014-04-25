'use strict';

// Added to make dates format to ISO8601 across browsers
// h/t: http://stackoverflow.com/a/2218874/124487
Date.prototype.toJSON = function (key) {
    function f(n) {
        // Format integers to have at least two digits.
        return n < 10 ? '0' + n : n;
    }

    return this.getUTCFullYear()   + '-' +
         f(this.getUTCMonth() + 1) + '-' +
         f(this.getUTCDate())      + 'T' +
         f(this.getUTCHours())     + ':' +
         f(this.getUTCMinutes())   + ':' +
         f(this.getUTCSeconds())   + '.' +
         f(this.getUTCMilliseconds())   + 'Z';
};

/* Services */
angular.module('myApp.services', []).
  value('version', '0.3'). // a simple value service
  factory('session', function () {
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
				store.set(sessionKey, session);
			};
		}

		return session;
	});
