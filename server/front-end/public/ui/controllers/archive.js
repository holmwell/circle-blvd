'use strict';

function ArchivesCtrl(session, $scope, $http, $filter, errors) {
	var projectId = undefined;
	var selectedArchive = undefined;
	var perPageLimit = 251;
	var totalArchivesCount = 0;

	if ($scope.showBackBar) {
		$scope.showBackBar();
	}

	$scope.isArchivesEmpty = function () {
		if (!$scope.archives) {
			return;
		}
		if ($scope.archives.length > 0) {
			return false;
		}
		return true;
	};

	$scope.select = function (archive) {
		if (archive.justDeselected) {
			// HACK: So right now whenever we call deselect,
			// the click event also bubbles up (or whatever)
			// to this method.
			archive.justDeselected = undefined;
			return;
		}

		// Do not refocus stuff if we're already on this archive.
		if (!archive.isSelected) {
			// Hide the previously-selected archive
			if (selectedArchive) {
				selectedArchive.isSelected = false;
			}

			archive.isSelected = true;
			selectedArchive = archive;
		}	
	};

	$scope.deselect = function (archive) {
		if (archive && archive.isSelected) {
			archive.isSelected = false;
			archive.justDeselected = true;
			
			selectedArchive = undefined;
		}
	};

	$scope.isArchiveSameDateAsPrevious = function (archive, index) {
		if (index === 0) {
			return false;
		}

		var previous = $scope.archives[index-1];

		var date1 = $filter('date')(archive.timestamp, 'mediumDate');
		var date2 = $filter('date')(previous.timestamp, 'mediumDate');

		return date1 === date2;
	};

	$scope.getTimestampFilter = function (archive) {
		var date = new Date(archive.timestamp);
		var now = new Date();
		if (now.getFullYear() === date.getFullYear()) {
			return 'MMM d';
		}
		else {
			return 'mediumDate';
		}
	};

	var getArchivesUrl = function (circleId, limit, timestamp) {
		var archivesUrl = '/data/' + circleId + '/archives';

		if (limit) {
			archivesUrl += '?limit=' + limit;	
			if (timestamp) {
				archivesUrl += '&startkey=' + timestamp;
			}
		}

		return archivesUrl;
	}

	$scope.showArchivesAt = function (timestamp) {
		var archivesUrl = getArchivesUrl(projectId, perPageLimit, timestamp);
		$http.get(archivesUrl)
		.success(function (archives) {
			$scope.archives	= $scope.archives.concat(archives);
			if ($scope.hasMoreArchives()) {
				$scope.lastArchiveOnPage = archives.pop();
			}
		})
		.error(function (status, data) {
			errors.log(data, status);
		});
	};

	$scope.hasMoreArchives = function () {
		if ($scope.archives) {
			return $scope.archives.length < totalArchivesCount;
		}
		return false;
	};

	$scope.$on("circleChanged", function () {
		init();
	});

	function init() {
		projectId = session.activeCircle;
		var archivesUrl = getArchivesUrl(projectId, perPageLimit); 

		$http.get(archivesUrl)
		.success(function (archives) {
			if (archives.length >= perPageLimit) {
				$scope.lastArchiveOnPage = archives.pop();
			}
			$scope.archives = archives;
		})
		.error(function (data, status) {
			errors.log(data, status);
		});

		$http.get('/data/' + projectId + '/archives/count')
		.success(function (data) {
			totalArchivesCount = data;
		})
		.error(function (data, status) {
			errors.log(data, status);
		});
	};

	init();
}
ArchivesCtrl.$inject = ['session', '$scope', '$http', '$filter', 'errors'];