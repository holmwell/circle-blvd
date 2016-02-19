// users.js
//
// TODO: This is no longer used?
//
module.exports = function (db) {
	/*
	 * GET user list
	 */
	var list = function (req, res) {
		db.users.getAll(function (err, users) {
			if (err) {
				res.send(500, err);
			} else {
				res.send(users);
			}
		});
	};

	/*
	 * POST a new user
	 */
	var add = function (req, res) {
		var data = req.body;

		var onSuccess = function() {
			res.send(201);
		};

		// TODO: better error handling
		// 400 - invalid request (invalid user, duplicate user)
		// 500 - internal server error (database)
		var onError = function (err) {
			res.send(500, err);
		};

		db.users.add(
			data.name, 
			data.email, 
			data.password, 
			data.memberships,
			data.isReadOnly,
			onSuccess, onError
		);
	};

	/*
	 * DELETE a user
	 */
	var remove = function (req, res) {
		var data = req.body;

		var onSuccess = function() {
			res.send(204);
		};

		var onError = function(err) {
			res.send(500, err);
		};

		db.users.remove(data, onSuccess, onError); 
	};

	return {
		list: list,
		add: add,
		remove: remove
	};
};