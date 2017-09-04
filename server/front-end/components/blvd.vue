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
         @nav="nav"
         @mindset-changed="setMindset")

      .main.container-fluid.no-select.debug
         .view
            story-list(
               :storyDictionary="storyDictionary", 
               :listMeta="listMeta"
               :keyboard="keyboard"
               @highlight="highlight")
</template>

<script>
import navbar       from './navbar.vue'
import circleHeader from './circleHeader.vue'
import storyList    from './storyList.vue'

import navvy        from './lib/navvy.js'
import highlighter  from './lib/highlighter.js'
import selector     from './lib/selector.js'
import mover        from './lib/mover.js'
import remover      from './lib/remover.js'
import saver        from './lib/saver.js'

import StoryListBus  from './lib/storyListBus.js'
import legacyStories from './lib/legacy/stories.js'

import http from 'axios'

export default {
   name: 'blvd',
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

      StoryListBus.$on('select-story', function (story) {
         selector.select(self.storyDictionary[story.id]);
      });

      StoryListBus.$on('deselect-story', function (story) {
         selector.deselect(self.storyDictionary[story.id]);
      });

      StoryListBus.$on('move-story-to-top', function (story, stories) {
         mover.moveToTop(self.storyDictionary[story.id], self.circleId);
      });

      StoryListBus.$on('remove-story', function (story) {
         remover.remove(self.storyDictionary[story.id]);
      });

      StoryListBus.$on('save-story', function (story) {
         saver.save(story);
      });

      StoryListBus.$on('save-story-comment', function (story) {
         saver.saveComment(story);
      });
   },
   mounted: function () {
      legacyStories.init(this.storyDictionary);
      var firstStory = this.storyDictionary[this.listMeta.firstStoryId];
      legacyStories.setFirst(firstStory);
   },
   methods: {
      nav: navvy.nav,
      signout: function() {
         http.get('/auth/signout').then(function () {
            //resetSession();
            navvy.nav("signin");
         });
      },
      setMindset: function (name) {
         this.mindset = name;
      },
      highlight: function (request) {
         var id = request.storyId;
         // We go through this 'event hassle' in order to
         // modify the storyDictionary proper ... even though
         // it's all pass-by-reference ... so, whatever.
         request.story = this.storyDictionary[id];
         highlighter.highlight(request);
      },
   }
}

// Ensure properties are defined so that Vue can put a getter 
// on them / react to changes. 
function getReactiveStories(stories) {
   var reactive = {};

   for (var prop in stories) {
      var story = reactive[prop] = stories[prop];

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