'use strict';

import forEach from 'lodash.foreach'

var self = {
   highlightedStories: [],
   mostRecentHighlight: null
};

function unhighlightAll() {
   while (self.highlightedStories.length > 0) {
      var story = self.highlightedStories.pop();
      story.isHighlighted = false;
      story.isMostRecentHighlight = false;

      self.mostRecentHighlight = null;
   }
}

function internalHighlight(storyToHighlight) {
   if (!storyToHighlight) {
      return;
   }

   forEach(self.highlightedStories, function (s) {
      s.isMostRecentHighlight = false;
   })

   self.mostRecentHighlight = storyToHighlight;
   storyToHighlight.isHighlighted = true;
   storyToHighlight.isMostRecentHighlight = true;
   self.highlightedStories.push(storyToHighlight);
}

// API: highlight
function highlight(request) {
   if (!request)
      return;

   var highlightType = request.type;
   var story = request.story;

   if (highlightType === 'single') {
      // Only allow one story to be highlighted.
      unhighlightAll();
   }

   // From cbDragAndDrop
   // TODO ...
   // if ($scope.isMovingTask) {
   //     return;
   // }

   if (self.highlightedStories.length === 0) {
      internalHighlight(story);
      return;
   }

   if (story.isHighlighted)
      return;

   var isHighlightingDown = request.storyIndex > self.mostRecentHighlight.index;
   var lastIndex = self.highlightedStories.length-1;
   var current = self.highlightedStories[lastIndex];

   while (current && current.id !== story.id) {
      var increment = isHighlightingDown ? 1 : -1; 
      current = request.stories[current.index + increment];
      internalHighlight(current);
   }
}

export default {
   highlight: highlight,
   unhighlightAll: unhighlightAll
}