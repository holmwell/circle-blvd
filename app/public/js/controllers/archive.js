function ArchivesCtrl(session, $scope, $http) {
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

	var init = function () {
		$http.get('/data/' + projectId + '/archives')
		.success(function (data) {
			$scope.archives = data;
		})
		.error(function (data) {
			console.log("Failed to get archives.");
			console.log(data);
		});
	};

	init();
}
ArchivesCtrl.$inject = ['session', '$scope', '$http'];