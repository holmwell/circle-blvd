function ArchivesCtrl($scope, $http) {
	var projectId = "1";

	$http.get('/data/' + projectId + '/archives')
	.success(function (data) {
		$scope.archives = data;
	})
	.error(function (data) {
		console.log("Failed to get archives.");
		console.log(data);
	});
}
ArchivesCtrl.$inject = ['$scope', '$http'];