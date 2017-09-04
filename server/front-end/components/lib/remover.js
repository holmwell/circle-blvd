'use strict';

import http    from 'axios'
import stories from './legacy/stories.js'
import errors  from './errors.js'

import StoryListBus from './storyListBus.js'

var scope = {
   $emit: function (e) {
      console.log(e);
   }
};

var removeFromView = function (viewStory, serverStory, shouldAnimate) {

   var nextStory = stories.get(serverStory.nextId);

   if (viewStory.isSelected) {
       viewStory.isSelected = false;
       selectedStory = undefined;
   }

   if (stories.isListBroken()) {
      // TODO: This doesn't really happen anymore, but 
      // we should still check just to be sure
       scope.$emit('storyListBroken');
       return;
   }

   var previousStory = stories.getPrevious(viewStory, serverStory);
   if (!previousStory) {
       stories.setFirst(nextStory);
   }
   else {
       previousStory.nextId = nextStory ? nextStory.id : getLastStoryId();
   }

   function actuallyRemove() {
       stories.remove(viewStory.id);
       StoryListBus.$emit('story-order-updated', 'remover.js');
   }

   if (shouldAnimate) {
      // TODO ... use Vue.js transitions ...
      // This happens via our realtime (socket.io) stuff
      // getStoryElement(viewStory.id).fadeOut(actuallyRemove);
   }
   else {
       actuallyRemove();
   }   
};

export default {
   remove: function (story) {
      var storyToRemove = stories.get(story.id);
      removeFromView(story, storyToRemove);

      http.put('/data/story/remove', storyToRemove)
      .then(function (data) {
          // nbd.
      })
      .catch(function (err) {
          errors.handle(err.response.data, err.response.status);
      });      
   }
}
