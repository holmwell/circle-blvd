var LocalDatabase = require('./local-database.js');
var designDocs    = require('./design-docs-couch.js');

var couch = function() {
	// TODO: Ideally, we want to make the database automatically
	// if 'circle-blvd' doesn't already exist on first run, and if
	// it does then ask for a new database name. For now, we're
	// letting future selves figure that out.

	var database = LocalDatabase('circle-blvd', designDocs);

	// getView(viewUrl, [options], callback)
	var getView = function(viewUrl, viewGenerationOptions, callback) {
		var splitViewUrl = viewUrl.split('/');
		var designName = splitViewUrl[0];
		var viewName = splitViewUrl[1];

		if (typeof viewGenerationOptions === "function") {
			callback = viewGenerationOptions;
			viewGenerationOptions = {};
		}

		database.view(designName, viewName, viewGenerationOptions, function (err, body, headers) {
			if (err) {
				callback(err);
				return;
			}
			
			if (viewGenerationOptions.returnKeys) {
				var docs = {};
				body.rows.forEach(function (doc) {
					docs[doc.key] = doc.value;
				});
			}
			else {
				var docs = [];
				body.rows.forEach(function (doc) {
					docs.push(doc.value);
				});	
			}
			
			callback(null, docs);
		});
	};

	var getDoc = function (docId, callback) {
		database.get(docId, callback);
	};

	var getDocs = function (docIds, callback) {
		if (!docIds || docIds.length < 1) {
			return callback(null, null);
		}

		var docsFound = [];
		var query = {};
		query["keys"] = docIds;
		database.fetch(query, function (err, body) {
			if (err) {
				return callback(err);
			}
			else {
				for (var rowIndex in body.rows) {
					docsFound.push(body.rows[rowIndex].doc);
				}
				return callback(null, docsFound);
			}
		});
	};

	var updateDoc = function (doc, callback) {
		database.get(doc._id, function (err, body) {
			if (err) {
				return callback(err);
			}
			doc._rev = body._rev;

			database.insert(doc, function (err, body) {
				if (err) {
					return callback(err);
				}
				doc._rev = body.rev;
				callback(null, doc);
			});
		});
	};

	var findOneByKey = function(viewName, key, callback) {
		var options = {
			limit: 1,
			key: key
		};
		getView(viewName, options, function (err, rows) {
			var doc = null;
			if (err) {
				callback(err);
			}
			else if (rows && rows.length > 0) {
				doc = rows[0];
			}
			callback(null, doc);
		});		
	}





	var addArchives = function(archives, callback) {
		var bulkDoc = {};
		var options = {};
		bulkDoc.docs = [];

		archives.forEach(function (archive) {
			archive.type = "archive";
			bulkDoc.docs.push(archive);
		});
		database.bulk(bulkDoc, options, callback);
	};

	var findArchivesByCircleId = function (circleId, callback) {
		var options = {
			startkey: [circleId, {}],
			endkey: [circleId],
			descending: true
		};
		getView("archives/byCircleId", options, function (err, rows) {
			callback(err, rows);
		});
	};


	return {
		findOneByKey: findOneByKey,
		view: getView,
		db: database,
		fetch: getDocs,
		database: {
			whenReady: database.whenReady
		},
		docs: {
			get: getDoc,
			update: updateDoc
		},
		archives: {
			add: addArchives,
			findByCircleId: findArchivesByCircleId
		}		
	}
}();

module.exports = function () {
	return couch;
}(); // closure