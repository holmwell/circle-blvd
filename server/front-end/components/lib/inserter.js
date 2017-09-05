'use strict';

import stories from './legacy/stories.js'
import mover   from './mover.js'

var isInsertingStory = false;
var storyBeingInserted = null;

var LabelRegex = /[:;,<> \\\{\[\(\!\?\.\`\'\"\*\)\]\}\/]/;

var lib = {
    // Options:
    //  * profileName: name associated with @@ assignment
    //  * owners: list of acceptable owner names (with @ assignment)
    parseStory: function (line, options) {
        var story = {};

        line = line.trim();
        // One-character tasks
        if (line.length === 1) {
            story.summary = line;
            return story;
        }
        
        // Parse mileposts
        if (line.indexOf('--') === 0) {
            story.isDeadline = true;
            // Remove all preceding hyphens,
            // so mileposts denoted with '----' 
            // are also possible.
            while (line.indexOf('-') === 0) {
                line = line.substring(1);
            }
            line = line.trim();
        }

        // Parse status
        if (line.indexOf("!!") === line.length-2) {
            story.status = "done"
            line = line.substring(0, line.length-2);
        }
        else if (line.indexOf("!") === line.length-1) {
            story.status = "assigned";
            line = line.substring(0, line.length-1);
        }

        // Parse owners
        if (line.length > 1
            && line.substring(line.length-2, line.length) === "@@") {
            story.owner = options.profileName;
            line = line.substring(0, line.length-2).trim();
        }
        else {
            // TODO: Allow assigning of owners that are not
            // in the owners list.
            var owners = options.owners || [];
            var ownerFound = story.isDeadline || false;
            var lowerCaseLine = line.toLowerCase();
            owners.forEach(function (owner) {
                if (ownerFound) {
                    return;
                }
                var lowerCaseOwner = owner.toLowerCase();
                // owners start with the @ sign and
                // are at the end of the line
                var ownerIndex = lowerCaseLine.indexOf(lowerCaseOwner);
                if (ownerIndex > 0 
                    && line[ownerIndex-1] === '@'
                    && line.length === ownerIndex + owner.length) {
                    ownerFound = true;
                    story.owner = owner;
                    line = line.substring(0, ownerIndex-1).trim();
                }
            });
        }

        // Parse labels
        story.labels = [];
        var words = line.split(LabelRegex);
        words.forEach(function (word) {
            if (word.indexOf('#') === 0) {
                story.labels.push(word.slice(1));
            }
        });

        story.summary = line;
        return story;
    }
};

function insertNewStoryIntoViewModel (serverStory) {
   // add the new story to the front of the backlog.
   // Don't actually need this, since it is fired by mover?
   // StoryListBus.$emit('story-order-updated', 'inserter.js');
   
   // legacy:
   // storiesList.unshift(serverStory);
   // if (serverStory.isDeadline) {
   //    buildMilepostList(storiesList);
   // }
}

function insertNewStory(newStory, circleId, listId, callback) {
   storyBeingInserted = newStory;
   
   // TODO: Get CircleId, ListId
   stories.insertFirst(newStory, circleId, listId, function (err, serverStory) {
      insertNewStoryIntoViewModel(serverStory);

      // $timeout(function () {
      //    scope.$broadcast('pulseStory', serverStory);
      // }, 50);

      if (callback) {
         callback(serverStory);
      }
   });
}

export default {
   insertStory: function (story, nextStory, circleId, listId, profileName, owners, callback) {
      if (!isInsertingStory && story && story.summary) {
          isInsertingStory = true;
          var newStory = lib.parseStory(story.summary, {
            profileName: profileName,
            owners: owners,
          });

          newStory.description = story.description;
          if (!newStory.isDeadline) {
              newStory.isDeadline = story.isDeadline;
          }
          
          // Insert the story at the top and then move
          // it down. Feel free to implement a new API
          // call that inserts directly into the list
          // at the correct spot, but this works for
          // the time being (and works with the io
          // engine).
          insertNewStory(newStory, circleId, listId, function (story) {

              var storyToMove = stories.get(story.id);
              mover.move(storyToMove, nextStory, listId);

              // scope.insertedStory = {};
              isInsertingStory = false;

              callback && callback();
          }); 
      }
   }
}