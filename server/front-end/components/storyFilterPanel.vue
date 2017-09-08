<template>
    <div class="filterWrapper row">
        <div class="col-sm-2" v-show="!isMindsetRoadmap"></div>
        <div class="col-xs-12 story filter" :class="columnClass">
            <div class="paddy">
                Showing only:
                <ul>
                    <li v-for="label in selectedLabels">
                        <a class="active-filter" @click="deselectLabel(label)">{{label}}</a>
                    </li>
                    <li v-if="selectedOwner"> 
                        <a class="active-filter" @click="deselectOwner">owned by {{selectedOwner}}</a>
                    </li>
                </ul>
                <div class="clear-filter pull-right">
                    &gt; <a class="jsLink" @click="clearFilter">show all</a> &lt;
                </div>
            </div>
        </div>
    </div>
</template>

<script>
    export default {
        props: {
            mindset: String,
            selectedOwner: String,
            selectedLabels: Array
        },
        computed: {
            columnClass: function () {
                return this.isMindsetRoadmap ? 'col-sm-12' : 'col-sm-8';
            },
            isMindsetRoadmap: function () {
                return this.mindset === 'roadmap';
            }
        },
        methods: {
            deselectLabel: function (label) {
                this.$emit('deselect-label', label);
            },
            deselectOwner: function () {
                this.$emit('deselect-owner');
            },
            clearFilter: function () {
                if (this.selectedOwner) {
                    this.deselectOwner();
                }
                for (var index in this.selectedLabels) {
                    this.deselectLabel(this.selectedLabels[index]);
                }
            }
        }
    }
</script>