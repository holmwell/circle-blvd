<template lang="pug">
div
   navbar(
      :circleId="circleId", 
      :member="member" 
      @nav="nav"
      @signout="signout")

   .main-wrapper
      circle-header(
         :circleId="circleId", 
         :member="member"
         :mindset="mindset"
         @nav="headerNav"
         @mindset-changed="setMindset")

      .main.container-fluid.no-select.debug
         .content.view.home
            router-view(
                :storyDictionary="storyDictionary"
                :listMeta="listMeta"
                :keyboard="keyboard"
                :member="member"
                :mindset="mindset")
</template>

<script>
import blvdRouter   from './blvdRouter.js'
import navbar       from './navbar.vue'
import circleHeader from './circleHeader.vue'
import storyList    from './storyList.vue'

import navvy        from './lib/navvy.js'
import highlighter  from './lib/highlighter.js'
import selector     from './lib/selector.js'
import mover        from './lib/mover.js'
import remover      from './lib/remover.js'
import saver        from './lib/saver.js'
import inserter     from './lib/inserter.js'

import StoryListBus  from './lib/storyListBus.js'
import legacyStories from './lib/legacy/stories.js'
import legacyDnd     from './lib/legacy/dragAndDrop.js'
import pulser        from './lib/legacy/storyPulser.js'

import http from 'axios'

var dnd = null;

export default {
   name: 'blvd',
   router: blvdRouter,
   props: ['circleId', 'member', 'stories', 'listMeta'],
   data: function () {
      return {
         mindset: 'detailed',
         storyDictionary: getReactiveStories(this.stories),
         keyboard: {
            isShiftDown: false
         }
      }
   },
   components: { 
      navbar, 
      circleHeader, 
      storyList 
   },
   created: function () {
      var self = this;
      window.addEventListener('keydown', function (e) {
         if (e.keyCode === 16) {
            self.keyboard.isShiftDown = true;
         }
      });

      window.addEventListener('keyup', function (e) {
         if (e.keyCode === 16) {
            self.keyboard.isShiftDown = false;
         }
      });

      StoryListBus.$on('highlight-story', function (request) {
         var id = request.storyId;
         // We go through this 'event hassle' in order to
         // modify the storyDictionary proper ... even though
         // it's all pass-by-reference ... so, whatever.
         request.story = self.storyDictionary[id];
         highlighter.highlight(request);
      });

      StoryListBus.$on('select-story', function (story) {
         selector.select(self.storyDictionary[story.id]);
      });

      StoryListBus.$on('deselect-story', function (story) {
         selector.deselect(self.storyDictionary[story.id]);
      });

      StoryListBus.$on('move-story-to-top', function (story, stories) {
         mover.moveToTop(self.storyDictionary[story.id], self.circleId);
      });

      StoryListBus.$on('move-story', function (story, nextStory) {
         mover.move(story, nextStory, self.circleId);
      });

      StoryListBus.$on('move-story-block', function (startStory, endStory, nextStory) {
         var start = self.storyDictionary[startStory.id];
         var end = self.storyDictionary[endStory.id];
         var next = nextStory ? self.storyDictionary[nextStory.id] : null;

         mover.moveStoryBlock(start, end, next, self.circleId);
         StoryListBus.$emit('story-order-updated');
      });

      StoryListBus.$on('remove-story', function (story) {
         remover.remove(self.storyDictionary[story.id]);
      });

      StoryListBus.$on('archive-story', function (storyId) {
         remover.archive(self.storyDictionary[storyId]);
      });

      StoryListBus.$on('save-story', function (story) {
         saver.save(story);
      });

      StoryListBus.$on('save-story-comment', function (story) {
         saver.saveComment(story);
      });

      StoryListBus.$on('mark-highlighted', function (status) {
         var highlighted = highlighter.getHighlightedStories();
         highlighted.forEach(function (story) {
            story.status = status;
            saver.save(story);
         });
      });

      StoryListBus.$on('insert-story', function (options) {
         inserter.insertStory(
            options.task, options.nextStory, self.circleId, self.circleId,
            self.member.name, [self.member.name],
            function () {
               // Serialize our insert behavior by sending 
               // events back and forth on the bus.
               StoryListBus.$emit('insert-queue-ready');
            }
         );
      });

      StoryListBus.$on('scroll-to-story', function (story) {
         pulser.scrollToAndPulse(story, 'data-left-story-id');
      });

      StoryListBus.$on('activate-dnd', function () {
         self.activateDnd();
      });
   },
   mounted: function () {
      legacyStories.init(this.storyDictionary);
      var firstStory = this.storyDictionary[this.listMeta.firstStoryId];
      legacyStories.setFirst(firstStory);

      var isScreenXs = false;
      dnd = legacyDnd(this.circleId, this.circleId, isScreenXs);
      this.activateDnd();
   },
   methods: {
      nav: navvy.nav,
      headerNav: function (destination) {
         switch (destination) {
            case 'archives':
               this.mindset = 'archives';
               blvdRouter.push({ name: 'archives' });
               break;
            default:
               navvy.nav(destination);
               break;
         }
      },
      signout: function() {
         http.get('/auth/signout').then(function () {
            //resetSession();
            navvy.nav("signin");
         });
      },
      setMindset: function (name) {
         blvdRouter.push({ name: 'default' });
         this.mindset = name;
         this.activateDnd();
      },
      activateDnd: function () {
         if (dnd) {
            dnd.activate(this.mindset);
         }
      }
   }
}

// Ensure properties are defined so that Vue can put a getter 
// on them / react to changes. 
function getReactiveStories(stories) {
   var reactive = {};

   for (var prop in stories) {
      var story = reactive[prop] = stories[prop];

      ensure(story, "isFirstAtLoad", false);
      ensure(story, "isSelected", false);
      ensure(story, "isHighlighted", false);
      ensure(story, "isMostRecentHighlight", false);
      ensure(story, "isAfterNextMeeting", false);
      // TODO: This doesn't work
      ensure(story, "comments", []);
   }

   return reactive;
}

function ensure (obj, prop, defaultValue) {
   obj[prop] = obj[prop] || defaultValue;
}

</script>