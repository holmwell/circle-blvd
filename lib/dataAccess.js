

var db = function() {
	// TODO: Use a database instead of arrays in memory.
	var userList = [];
	var userEmailToId = [];
	var passwordList = [];

	var isValidUser = function(user) {
		return user && user.email && user.id;
	}

	var hashPassword = function(password) {
		return password;
	}
	
	return {
		users: { 
			add: function(user, password, success, failure) {				
				if (!isValidUser(user)) {
					// TODO: Error?
					failure("User cannot be null?");
					return;
				}

				if (this.findById(user.id)) {
					// TODO: Error codes, etc.
					failure("User already exists.");
					return;
				}

				if (this.findByEmail(user.email)) {
					//TODO: Error?
					failure("User email already exists");
					return;
				}

				userList[user.id] = user;
				userEmailToId[user.email] = user.id;
				passwordList[user.id] = hashPassword(password);
				success();
			},
			remove: function(user, success, failure) {
				if (!(user && user.email)) {
					// Do nothing. TODO: Do what?
				}
				else if (this.findById(user.id)) {
					// TODO: Test this.
					delete userList[user.id];
					delete userEmailToId[user.email];
					delete passwordList[user.id];
					success();
				}

				// TODO: Error codes.
				failure();
			},
			findByEmail: function(userEmail) {
				var id = userEmailToId[userEmail];
				return id ? this.findById(id) : null;
			},
			findById: function(id) {
				var user = userList[id];
				return user ? user : null;
			},
			update: function(user, success, failure) {
				if (isValidUser(user) && this.findById(user.id)) {
					userList[user.id] = user;
					userEmailToId[user.email] = user.id;
					success();
				} else {
					failure();
				}
			},
			updatePassword: function(user, password, success, failure) {
				if (isValidUser(user) && this.findById(user.id)) {
					passwordList[user.id] = hashPassword(password);
					success();
				} else {
					failure();
				}	
			},
			validatePassword: function(user, password, success, failure) {
				if(isValidUser(user) && passwordList[user.id] == hashPassword(password)) {
					success();
				} else {
					failure();
				}	
			},
			count: function() {
				return Object.keys(userList).length;
			}
		}
	}; // end return
}();


exports.instance = function() {
	return db;
};
