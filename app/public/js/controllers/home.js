function HomeCtrl($scope) {

	var stories = [];
	stories[0] = {
		id: 1,
		summary: "What whaaaat"
	};
	stories[1] = {
		id: 2,
		summary: "Wooorddd"
	};
	stories[2] = {
		id: 3,
		summary: "Ok!"
	}

	$scope.stories = stories;
}
HomeCtrl.$inject = ['$scope'];
