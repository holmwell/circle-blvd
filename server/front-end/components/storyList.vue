<template lang="pug">
div
      list-tool-panel(
         :isInserting="isShowingInsertStory"
         :profileName="accountName"
         :selectedOwner="selectedOwner"
         @show-entry="showEntry"
         @select-my-tasks="selectMyTasks"
         @search="updateSearchEntry")
      story-filter-panel(v-show="isShowingFilterPanel"
         :selected-labels="selectedLabels"
         :selected-owner="selectedOwner"
         @deselect-label="deselectLabel"
         @deselect-owner="deselectOwner")

      #backlog
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
            :mindset="mindset"
            :owners="owners"
            :account-name="accountName"
            :keyboard="keyboard"
            @cut-highlighted="cutHighlighted"
            @highlight="highlight"
            @paste-highlighted="pasteHighlighted"
            @select-label="selectLabel"
            @select-owner="selectOwner"
            @show-insert-story="showInsertStory"
            @hide-insert-story="hideInsertStory")
</template>

<script>
import cbStoryList from './cbStoryList.vue'
import storyFilterPanel from './storyFilterPanel.vue'
import listToolPanel from './listToolPanel.vue'
import listBuilder from './lib/storyListBuilder.js'

import legacyStories from './lib/legacy/stories.js'
import StoryListBus  from './lib/storyListBus.js'

import clipboard from './lib/legacy/clipboard.js'
import highlighter from './lib/highlighter.js'
import mover from './lib/mover.js'

// import listUtil    from './lib/storyListUtil.js'
// import dragAndDrop from './lib/dragAndDrop.js'

export default {
   components: { cbStoryList, storyFilterPanel, listToolPanel },
   props: ['storyDictionary', 'listMeta', 'keyboard', 'member'],
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
         stories: [],
         selectedOwner: '',
         selectedLabels: [],
         searchEntry: [],
         isScreenXs: false,
         isShowingInsertStory: false,
         isClipboardActive: false,
         isSearching: false,
         mindset: 'detailed',
         owners: [],
         accountName: this.member.name
      }
   },
   computed: {
      isShowingFilterPanel: function () {
         return this.selectedLabels.length > 0 || this.selectedOwner;
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

      var initialArray = listBuilder.getStoryArray(
         this.storyDictionary, 
         this.storyDictionary[this.listMeta.firstStoryId]);

      initialArray[0].isFirstAtLoad = true;
      self.stories = initialArray;
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
      pasteHighlighted: function () {
         var highlightedStories = highlighter.getHighlightedStories();
         var stories = legacyStories;
         var moveStoryBlock = mover.getMoveStoryBlock(this.listMeta.listId);

         clipboard.pasteHighlighted(highlightedStories, 
             moveStoryBlock,
             stories);

         // TODO: reactivity is broken
         if (highlightedStories.length > 0) {
            var mostRecent = highlightedStories[0];
            highlighter.setMostRecent(mostRecent);
         }
         this.isClipboardActive = clipboard.isActive();
      },
      showEntry: function () {
         this.highlight({
            storyId: this.stories[0].id,
            type: 'single'
         });

         this.showInsertStory();
      },
      showInsertStory: function () {
         this.isShowingInsertStory = true;
      },
      hideInsertStory: function () {
         this.isShowingInsertStory = false;
      },
      selectLabel: function (text) {
         if (this.selectedLabels.indexOf(text) < 0) {
            this.selectedLabels.push(text);
         }
      },
      deselectLabel: function (text) {
         var index = this.selectedLabels.indexOf(text);
         if (index >= 0) {
            this.selectedLabels.splice(index, 1);
         }
      },
      selectOwner: function (owner) {
         if (owner) {
            this.selectedOwner = owner;
         }
      },
      deselectOwner: function () {
         this.selectedOwner = null;
      },
      selectMyTasks: function () {
         this.selectOwner(this.accountName);
      },
      updateSearchEntry: function (val) {
         this.searchEntry = val;
      }
   }
}
</script>