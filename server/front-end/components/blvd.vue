<template lang="pug">
div(@keydown="keydown(event)" @keyup="keyup(event)")
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

import StoryBus     from './lib/storyBus.js'
import StoryListBus from './lib/storyListBus.js'

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
   }

   return reactive;
}

function ensure (obj, prop, defaultValue) {
   obj[prop] = obj[prop] || defaultValue;
}

</script>