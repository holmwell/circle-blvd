<template lang="pug">
  cb-story-list#sortableList(
    :scope="scope" 
    :stories="stories"
    :highlighted-stories="highlightedStories"
    :selected-owner="selectedOwner"
    :selected-labels="selectedLabels"
    :search-entry="searchEntry"
    :is-screen-xs="isScreenXs"
    :is-showing-insert-story="isShowingInsertStory"
    :is-clipboard-active="isClipboardActive"
    :is-searching="isSearching"
    :initial-mindset="mindset"
    :owners="owners"
    :account-name="accountName")
</template>

<script>
import cbStoryList from './cbStoryList.vue'
import listBuilder from './lib/storyListBuilder.js'

export default {
  components: { cbStoryList },
  props: ['storyDictionary', 'listMeta'],
  data: function () {
    return {
      scope: {
        // A few no-op functions to satisfy the cb-story-list
        $on: this.nope,
        $emit: this.nope,
        isStoryHighlightedByTeam: this.nope,
        hideInsertStory: this.nope,
        keyboard: {}
      },
      stories: listBuilder.getStoryArray(this.storyDictionary, this.listMeta),
      highlightedStories: [],
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
    nope: function () {}
  }
}
</script>