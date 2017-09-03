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
      @highlight="highlight")
</template>

<script>
import cbStoryList from './cbStoryList.vue'
import listBuilder from './lib/storyListBuilder.js'

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
         stories: listBuilder.getStoryArray(this.storyDictionary, this.listMeta),
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
   methods: {
      nope: function () {},
      highlight: function (request) {
         request.stories = this.stories;
         this.$emit('highlight', request);
      }
   }
}
</script>