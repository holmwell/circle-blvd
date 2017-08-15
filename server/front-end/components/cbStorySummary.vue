<template><span>
	<span v-if="!hasLabels">{{summary}}</span>
	<span v-else v-for="(s, index) in spans">
		<span v-if="s.isLabel" @mouseup.stop.prevent v-on:click.stop.prevent="selectLabel(s.label)">
			<span v-if="(index !== 0)">&nbsp;</span><span class="story-label">{{s.text}}</span>
		</span>
		<span v-else-if="s.isPostLabel">{{s.text}}</span>
		<span v-else> {{s.text}}</span>
	</span>
</span></template>

<script>
var ReplaceLabelRegex = /[#:;,<> \\\{\[\(\!\?\.\`\'\"\*\)\]\}\/]/g;

module.exports = {
	props: {
		summary: String
	},
	computed: {
		words: function () {
			return this.summary.split(' ');
		},
		hasLabels: function () {
			var words = this.words;
			for (var index in words) {
				if (words[index].indexOf('#') === 0) {
					return true;
				}
			}
			return false;
		},
		spans: function () {
			var hasLabels = false;
			var summary = this.summary;
			var words = this.words;

			var spans = [];
			for (var index in words) {
				var word = words[index];
				var span = {};
				var postSpan = undefined;

				if (word.indexOf('#') === 0) {
					span.isLabel = true;
					span.label = word.replace(ReplaceLabelRegex, "");
					span.text = word.slice(1);

					// Separate the label from any punctuation that
					// follows it.
					var postWord = span.text.replace(span.label, "");
					if (postWord.length > 0) {
						postSpan = {};
						postSpan.isPostLabel = true;
						postSpan.text = postWord;
						span.text = span.label;
					}
				}
				else {
					span.text = word;
				}
				spans.push(span);
				if (postSpan) {
					spans.push(postSpan);
				}
			}
			return spans;
		}
	},

	methods: {
		selectLabel: function (text) {
			this.$emit('select-label', text);
		}
	}
};
</script>