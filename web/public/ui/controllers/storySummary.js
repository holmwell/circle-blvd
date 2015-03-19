'use strict';

function StorySummaryCtrl(lib, session, $scope) {

    $scope.selectLabel = function (e, text) {
        $scope.$emit('labelSelected', text);
        e.preventDefault();
        e.stopPropagation();
    };

    $scope.prevent = function (e) {
        e.preventDefault();
        e.stopPropagation();
    };

    var updateScope = function (summary) {
        var hasLabels = false;
        var summary = $scope.story.summary;
        var words = summary.split(' ');

        var spans = [];
        for (var index in words) {
            var word = words[index];
            var span = {};
            var postSpan = undefined;
            
            if (word.indexOf('#') === 0) {
                hasLabels = true;
                span.isLabel = true;
                span.label = word.replace(lib.consts.ReplaceLabelRegex, "");
                span.text = word.slice(1);

                // Separate the label from any punctuation that
                // follows it.
                var postWord = span.text.replace(span.label, "");
                if (postWord.length > 0) {
                    postSpan = {};
                    postSpan.isPostLabel = true;
                    postSpan.text = postWord;
                    span.text = span.label;
                }
            }
            else {
                span.text = word;
            }
            spans.push(span);
            if (postSpan) {
                spans.push(postSpan);
            }
        }

        $scope.spans = spans;
        $scope.hasLabels = hasLabels;
    };

    $scope.$watch('story.summary', function (val) {
        updateScope(val);
    });

    updateScope($scope.story.summary);
}
StorySummaryCtrl.$inject = ['lib', 'session', '$scope'];