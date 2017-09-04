<template lang="pug">
   cb-story-list#sortableList(
      :scope="scope" 
      :stories="stories"
      :selected-owner="selectedOwner"
      :selected-labels="selectedLabels"
      :search-entry="searchEntry"
      :is-screen-xs="isScreenXs"
      :is-showing-insert-story="isShowingInsertStory"
      :is-clipboard-active="isClipboardActive"
      :is-searching="isSearching"
      :initial-mindset="mindset"
      :owners="owners"
      :account-name="accountName"
      :keyboard="keyboard"
      @cut-highlighted="cutHighlighted"
      @highlight="highlight"
      @select-label="selectLabel"
      @select-owner="selectOwner")
</template>

<script>
import cbStoryList from './cbStoryList.vue'
import listBuilder from './lib/storyListBuilder.js'

import legacyStories from './lib/legacy/stories.js'
import StoryListBus  from './lib/storyListBus.js'

import clipboard from './lib/legacy/clipboard.js'
import highlighter from './lib/highlighter.js'

// import listUtil    from './lib/storyListUtil.js'
// import dragAndDrop from './lib/dragAndDrop.js'

export default {
   components: { cbStoryList },
   props: ['storyDictionary', 'listMeta', 'keyboard'],
   data: function () {
      return {
         scope: {
            // A few no-op functions to satisfy the cb-story-list
            $on: this.nope,
            $emit: this.nope,
            isStoryHighlightedByTeam: this.nope,
            showInsertStory: this.nope,
            hideInsertStory: this.nope,
            cutHighlighted: this.nope,
            pasteHighlighted: this.nope,
            markHighlightedAs: this.nope,
            keyboard: {}
         },
         stories: listBuilder.getStoryArray(
            this.storyDictionary, 
            this.storyDictionary[this.listMeta.firstStoryId]
         ),
         selectedOwner: '',
         selectedLabels: [],
         searchEntry: [],
         isScreenXs: false,
         isShowingInsertStory: false,
         isClipboardActive: false,
         isSearching: false,
         mindset: 'detailed',
         owners: [],
         accountName: ''
      }
   },
   created: function () {
      var self = this;
      StoryListBus.$on('story-order-updated', function() {
         // Developers note: Vue can be slow in development mode
         // as list size increases, and this will take a second,
         // but in production mode it is near-instant.
         self.stories = listBuilder.getStoryArray(
            self.storyDictionary, 
            legacyStories.getFirst());
      });
   },
   methods: {
      nope: function () {},
      highlight: function (request) {
         request.stories = this.stories;
         this.$emit('highlight', request);
      },
      cutHighlighted: function () {
         var highlightedStories = highlighter.getHighlightedStories();
         var stories = legacyStories;
         
         clipboard.cutHighlighted(highlightedStories, stories);
         this.isClipboardActive = clipboard.isActive();
      },
      selectLabel: function (text) {
         if (this.selectedLabels.indexOf(text) < 0) {
            this.selectedLabels.push(text);
         }
      },
      selectOwner: function (owner) {
         if (owner) {
            this.selectedOwner = owner;
         }
      }
   }
}
</script>