import stories      from './legacy/stories.js'
import StoryListBus from './storyListBus.js'

var LabelRegex = /[:;,<> \\\{\[\(\!\?\.\`\'\"\*\)\]\}\/]/;

export default {
   save: function (story) {
      var storyToSave = stories.get(story.id);
      
      // Parse labels out of story.summary
      story.labels = [];
      var words = story.summary.split(LabelRegex);

      words.forEach(function (word) {
          word = word.trim();
          if (word.indexOf('#') === 0) {
              story.labels.push(word.slice(1));
          }
      });

      // TODO: We can probably just have this on the 
      // server side, but it's nice to have clean
      // traffic I guess.
      storyToSave.summary = story.summary;
      storyToSave.owner = story.owner;
      storyToSave.status = story.status;
      storyToSave.description = story.description;
      storyToSave.labels = story.labels;

      storyToSave.newComment = story.newComment;
      
      stories.set(story.id, storyToSave, function (savedStory) {
         console.log(savedStory);
          story.newComment = undefined;
          story.comments = savedStory.comments;
          story.isOwnerNotified = savedStory.isOwnerNotified;
      });

      if (storyToSave.isDeadline || storyToSave.isNextMeeting) {
         // TODO: Ensure this sort of thing is taken care of with the
         // Vue setup
         //
          // scope.mileposts.forEach(function (milepost) {
          //     if (storyToSave.id === milepost.id) {
          //         milepost.summary = storyToSave.summary;
          //     }
          // });
      }
   },

   saveComment: function (story) {
      stories.saveComment(story, story.newComment, function (savedStory) {
         story.newComment = undefined;
         story.comments = savedStory.comments;
      });
   }
}