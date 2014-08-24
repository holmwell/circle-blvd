'use strict';

function StorySummaryCtrl(session, $scope) {

    $scope.selectLabel = function (text) {
        $scope.$emit('labelSelected', text);
    };

    var updateScope = function (summary) {
        var summary = $scope.story.summary;
        var words = summary.split(' ');

        var spans = [];
        for (var index in words) {
            var word = words[index];
            var span = {};
            if (word.indexOf('#') === 0) {
                span.isLabel = true;
                span.text = word.slice(1);
            }
            else {
                span.text = word;
            }
            spans.push(span);
        }

        $scope.spans = spans;    
    };

    $scope.$watch('story.summary', function (val) {
        updateScope(val);
    });

    updateScope($scope.story.summary);
}
StorySummaryCtrl.$inject = ['session', '$scope'];