import forEach from 'lodash.foreach'

var highlightedStories = [];

var unhighlightAll = function () {
   while (highlightedStories.length > 0) {
      var story = highlightedStories.pop();
      story.isHighlighted = false;
      story.isMostRecentHighlight = false;
      // TODO: This is a bit fragile ... should
      // wrap the highlight methods soon.
      story.highlightedFrom = 'none';
      // $scope.$broadcast('storyUnhighlighted', story);
   }
};

var internalHighlight = function (storyToHighlight) {
   if (!storyToHighlight) {
      return;
   }

   forEach(highlightedStories, function (s) {
      s.isMostRecentHighlight = false;
   })

   storyToHighlight.isHighlighted = true;
   storyToHighlight.isMostRecentHighlight = true;
   // storyToHighlight.highlightedFrom = mouse.direction;
   highlightedStories.push(storyToHighlight);

   // $scope.$emit('storyHighlighted', storyToHighlight);
   // $scope.$broadcast('storyHighlighted', storyToHighlight);
};

// API: highlight
var highlight = function (story, highlightType) {
   if (highlightType === 'single') {
      // Only allow one story to be highlighted.
      unhighlightAll();
   }

   // From cbDragAndDrop
   // TODO ...
   // if ($scope.isMovingTask) {
   //     return;
   // }

   if (highlightedStories.length === 0) {
      internalHighlight(story);
      return;
   }

   if (story.isHighlighted)
      return;

    // Account for the mouse leaving and re-entering
    // the list during a drag. Also makes fast drags
    // work, if they're going in one direction
    // if (!isMouseAboveFirstHighlight()) {
    //     var current = highlightedStories[highlightedStories.length-1];

    //     while (current && current.id !== story.id) {
    //         current = stories().get(current.nextId);
    //         internalHighlight(current);
    //     }
    // }
    // else {
    //     var current = highlightedStories[highlightedStories.length-1];

    //     while (current && current.id !== story.id) {
    //         current = stories().getPrevious(current, stories().get(current.id));
    //         internalHighlight(current);
    //     }
    // }
};

export default {
   highlight: highlight,
   unhighlightAll: unhighlightAll
}