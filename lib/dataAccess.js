

var db = function() {
	// TODO: Use a database instead of arrays in memory.
	var userList = [];
	var passwordList = [];
	
	return {
		users: { 
			add: function(user, success, failure) {
				if (!(user && user.email)) {
					// TODO: Error?
					failure("User cannot be null?");
					return;
				}
				if (this.find(user.email)) {
					// TODO: Error codes, etc.
					failure("User already exists.");
					return;
				}

				userList[user.email] = user;
				success();
			},
			remove: function(user, success, failure) {
				if (!(user && user.email)) {
					// Do nothing. TODO: Do what?
				}
				else if (this.find(user.email)) {
					// TODO: Test this.
					delete userList[user.email];
					success();
				}

				// TODO: Error codes.
				failure();
			},
			find: function(userEmail) {

				var user = userList[userEmail];
				if (user) {
					return user;
				}
				else {
					return null;
				}
			},
			update: function(user, success, failure) {
				if (user && user.email) {
					userList[user.email] = user;
					success();
				}
				failure();
			},
			count: function() {
				return Object.keys(userList).length;
			}
		}, // end users

		passwords: {
			add: function(user, passwordHash) {

			},
			remove: function(user) {

			},
			update: function(user, passwordHash) {

			},
			matches: function(user, passwordHash) {
				return true;
			}
		} // end passwords
	}; // end return
}();


exports.instance = function() {
	return db;
};
