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
               @highlight="highlight")
</template>

<script>
import navbar       from './navbar.vue'
import circleHeader from './circleHeader.vue'
import storyList    from './storyList.vue'

import navvy        from './lib/navvy.js'
import highlighter  from './lib/highlighter.js'

import http from 'axios'

export default {
   name: 'blvd',
   props: ['circleId', 'member', 'stories', 'listMeta'],
   data: function () {
      return {
         mindset: 'detailed',
         storyDictionary: getReactiveStories(this.stories)
      }
   },
   components: { 
      navbar, 
      circleHeader, 
      storyList 
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
      highlight: function (id, type) {
         highlighter.highlight(this.storyDictionary[id], type);
      },
   }
}

// Ensure properties are defined so that Vue can put a getter 
// on them / react to changes. 
function getReactiveStories(stories) {
   var reactive = {};

   for (var prop in stories) {
      var story = reactive[prop] = stories[prop];

      ensure(story, "isHighlighted", false);
      ensure(story, "isMostRecentHighlight", false);
   }

   return reactive;
}

function ensure (obj, prop, defaultValue) {
   obj[prop] = obj[prop] || defaultValue;
}

</script>