function ArchivesCtrl(session, $scope, $http, $filter, errors) {
	var projectId = session.activeCircle;
	var selectedArchive = undefined;

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

	var init = function () {
		$http.get('/data/' + projectId + '/archives')
		.success(function (data) {
			$scope.archives = data;
		})
		.error(function (data, status) {
			errors.log(data, status);
		});
	};

	init();
}
ArchivesCtrl.$inject = ['session', '$scope', '$http', '$filter', 'errors'];