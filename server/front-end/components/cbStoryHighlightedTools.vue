<script>
module.exports = {
    props: {
        isMostRecentHighlight: Boolean
    },
    data: function () {
        return {
            isScreenXs: false,
            isClipboardActive: false,
            isShowingInsertStory: false,
            iconCircleSvg: require('../public/img/glyphs/icon-circle.svg'),
            iconHalfCircleSvg: require('../public/img/glyphs/icon-half-circle.svg'),
        }
    },
    methods: {
        markHighlightedAs: function (status) {
            this.$emit('change-status', status);
        },
        isMindset: function (m) {
            // TODO ...
            return false;
        },
        hideInsertStory: function () {
            // TODO ...
        },
        pasteHighlighted: function () {

        }
    }
}
</script>

<template>
<div> <!-- Root to get overriden -->
    <div v-if="!isScreenXs && isMostRecentHighlight && !isMindset('roadmap')" id="highlightedTools" class="hidden-xs">
        <div class="tools">
            <div ng-if="!isClipboardActive && !isShowingInsertStory" class="regularTools">
                <div class="jsLink" @click="markHighlightedAs('active')">
                    <span class="done" v-html="iconHalfCircleSvg"></span> On it
                </div>
                <div class="jsLink" @click="markHighlightedAs('done')">
                    <span class="done" v-html="iconCircleSvg"></span> Done
                </div>

<!--                 <div class="jsLink" 
                    ng-click="showInsertStory()">
                    <span class="">
                        <span class="glyphicon glyphicon-plus"></span>
                    </span> Add task
                </div>
 -->
<!--                 <div class="jsLink" ng-click="cutHighlighted()">
                    <span class="glyphicon glyphicon-scissors"></span> Cut
                </div>
 -->            </div>

            <div v-if="isShowingInsertStory" class="insertTools">
                <div class="jsLink" @click="hideInsertStory">
                    <span class="glyphicon glyphicon-remove"></span> Hide entry
                </div>
            </div>

            <div v-if="isClipboardActive" class="clipboardTools">
                <div class="jsLink" @click="pasteHighlighted">
                    <span class="glyphicon glyphicon-paste"></span> Paste
                </div>
            </div>
        </div>
    </div>
</div>
</template>