'use strict';

import stories      from './legacy/stories.js'
import StoryListBus from './storyListBus.js'
import errors       from './errors.js'


var self = {
   listId: null
}

// Migration facade
function $timeout (fn, ms) {
    window.setTimeout(fn, ms);
};

var pulse = function () {}

var scope = {
   $emit: function (x, y) {
      console.log(x);
   }
}
// End migration facade

var getLastStoryId = function () {
   return "last-" + self.listId;
};

var isStoryBetween = function (story, start, end) { 
   if (!story) {
      return false;
   }

   if (end.id === story.id) {
      return true;
   }

   // Note: Assumes a valid block, otherwise it is 
   // infinite loop time
   var current = start;
   while (current.id !== end.id) {
      if (current.id === story.id) {
         return true;
      }

      if (current.nextId === getLastStoryId()) {
         return false;
      }
      current = stories.get(current.nextId)
   }

   return false;
};

// Returns true if a move actually happened
function moveStoryBlock (uiStartStory, startStory, endStory, nextStory, isLocalOnly) {
   var storyToMove = startStory;

   if (startStory.id === nextStory.id 
      || startStory.nextId === nextStory.id
      || endStory.id === nextStory.id
      || endStory.nextId === nextStory.id
      || isStoryBetween(nextStory, startStory, endStory)) {
      // Do nothing.
      return false;
   }

   // Update data model
   // TODO: Refactor, to share the same code used
   // in the drag and drop module.
   var preMove = {
       storyBefore: stories.getPrevious(uiStartStory, startStory),
       storyAfter: stories.get(endStory.nextId)
   };

   var postMove = {
       storyBefore: stories.getPrevious(nextStory, nextStory),
       storyAfter: nextStory
   };

   // If the moved story was the first story, the preMove.storyAfter
   // is now the first story (if it exists).
   if (stories.getFirst().id === startStory.id && preMove.storyAfter) {
       stories.setFirst(preMove.storyAfter);
   }

   // We need to update 'nextId' of the following:
   // 1. The story before the moved story, before it was moved.        
   if (preMove.storyBefore) {
       preMove.storyBefore.nextId = preMove.storyAfter ? preMove.storyAfter.id : getLastStoryId();
   }

   // 2. ...
   if (postMove.storyBefore) {
       postMove.storyBefore.nextId = startStory.id;
   }
   else {
       stories.setFirst(startStory);   
   }
   
   // 3. ...
   endStory.nextId = postMove.storyAfter ? postMove.storyAfter.id : getLastStoryId();

   // Update view model
   StoryListBus.$emit('story-order-updated', 'mover.js');

   // ...
   $timeout(function () {
       pulse(startStory);
   }, 100);

   if (isLocalOnly) {
       return true;
   }

   // Update server
   $timeout(function() {
       stories.moveBlock(startStory, endStory, nextStory, function (err, response) {
           if (err) {
               // We failed. Probably because of a data integrity issue
               // on the server that we need to wait out. 
               errors.handle(err.data, err.status);
               return;
           }
           else {
               if (startStory.id === endStory.id) { 
                   scope.$emit('storyMoved', startStory);
               } 
               else {
                   scope.$emit('storyBlockMoved', startStory, endStory);
               }           
           }
       });
   }, 0);

   return true;
}

function moveStory (uiStory, storyToMove, nextStory) {
   moveStoryBlock(uiStory, storyToMove, storyToMove, nextStory);
}

export default {
   moveToTop: function (story, listId) {
      self = {
         listId: listId
      };

      var nextStory = stories.find(function (story) {
         return story.isNextMeeting;
      });

      moveStoryBlock(story, story, story, nextStory);
   },

   move: function (story, nextStory, listId) {
      // TODO: This is tenuous at best
      self = {
         listId: listId
      };
      moveStory(story, story, nextStory);
   },

   getMoveStoryBlock: function (listId) {
      // TODO: This is tenuous at best
      self = {
         listId: listId
      }
      return moveStoryBlock;
   }
}