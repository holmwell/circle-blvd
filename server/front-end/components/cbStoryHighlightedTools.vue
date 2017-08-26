<script>
export default {
    props: {
        isMostRecentHighlight: Boolean,
        isShowingInsertStory: Boolean,
        isScreenXs: Boolean,
        isClipboardActive: Boolean,
        mindset: String
    },
    data: function () {
        return {
            iconCircleSvg: require('../public/img/glyphs/icon-circle.svg'),
            iconHalfCircleSvg: require('../public/img/glyphs/icon-half-circle.svg'),
        }
    },
    methods: {
        markHighlightedAs: function (status) {
            this.$emit('change-status', status);
        },
        showInsertStory: function () {
            this.$emit('show-insert-story');
        },
        hideInsertStory: function () {
            this.$emit('hide-insert-story');
        },
        pasteHighlighted: function () {
            this.$emit('paste');
        },
        cutHighlighted: function () {
            this.$emit('cut');
        }
    }
}
</script>

<template lang="pug">
div <!-- Root to get overriden -->
    #highlightedTools
        .tools
            .regularTools(v-if="!isClipboardActive && !isShowingInsertStory")
                .jsLink(@click="markHighlightedAs('active')")
                    span.done(v-html="iconHalfCircleSvg") 
                    span.text On it

                .jsLink(@click="markHighlightedAs('done')")
                    span.done(v-html="iconCircleSvg") 
                    span.text Done

                .jsLink(@click="showInsertStory")
                    span.glyphicon.glyphicon-plus
                    span.text Add task

                .jsLink(@click="cutHighlighted")
                    span.glyphicon.glyphicon-scissors 
                    span.text Cut

            .insertTools(v-if="isShowingInsertStory")
                .jsLink(@click="hideInsertStory")
                    span.glyphicon.glyphicon-remove 
                    span.text Hide entry

            .clipboardTools(v-if="isClipboardActive")
                .jsLink(@click="pasteHighlighted")
                    span.glyphicon.glyphicon-paste 
                    span.text Paste
</template>

<style scoped>
    .text {
        display: inline-block;
        padding-left: 0.5ex;
    }
</style>