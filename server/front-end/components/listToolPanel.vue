<template>
<div>
    <div class="entry-facade no-select">
        <div class="clearfix entry-facade-container">
            <div class="col-xs-12 debug alignWithStoryList" :class="entryWidthClass">
                <div class="col-xs-6 show-search debug">
                    <span @click="showSearch" :class="isSearching ? 'active' : ''" 
                        @mouseenter="setSearchBarLabel('Search')"
                        @mouseleave="setSearchBarLabel('')"
                        class="glyphicon glyphicon-search"></span>

                    <span @click="selectMyTasks" 
                        :class="(selectedOwner === profileName) ? 'active' : ''"
                        @mouseenter="setSearchBarLabel('My tasks')"
                        @mouseleave="setSearchBarLabel('')"
                        class="glyphicon glyphicon-record"></span>

                    <span class="searchBarLabel">{{searchBarLabel}}</span>
                </div>

                <div class="col-xs-6 show-entry">
                    <div class="pull-right" v-show="isSearching">
                        <a @click="hideSearch" class="jsLink subtle">Hide search</a>
                    </div>
                    <span v-show="!(isSearching || isInserting)">
                        + <a @click="showEntry" class="jsLink">Add task</a>
                    </span>
                </div>

            </div>
        </div>
    </div>

    <div class="search" v-if="isSearching">
        <div class="row">
            <div class="col-xs-12 debug" :class="searchWidthClass">
                <div class="debug new-story row alignWithStoryList">
                    <input id="searchEntry" type="text" autocomplete="off" 
                        placeholder="Search ..."
                        class="form-control" v-model="searchEntry" />
                </div>
            </div>
        </div>
    </div>
</div>
</template>

<script>
    export default {
        props: {
            mindset: String,
            isInserting: Boolean,
            selectedOwner: String,
            profileName: String
        },
        data: function() {
            return {
                isSearching: false,
                searchBarLabel: null,
                searchEntry: null
            }
        },
        computed: {
            entryWidthClass: function () {
                return {
                    'col-sm-7': this.isMindsetRoadmap,
                    'col-sm-offset-2': !this.isMindsetRoadmap,
                    'col-sm-8': !this.isMindsetRoadmap
                }
            },
            searchWidthClass: function () {
                return {
                    roadmapOffset: this.isMindsetRoadmap,
                    'col-sm-7': this.isMindsetRoadmap,
                    'col-sm-offset-2': !this.isMindsetRoadmap,
                    'col-sm-8': !this.isMindsetRoadmap
                }
            },
            isMindsetRoadmap: function () {
                return this.mindset === 'roadmap';
            }
        },
        methods: {
            showEntry: function () {
                this.$emit('show-entry');
            },
            showSearch: function () {
                this.isSearching = true;
            },
            hideSearch: function () {
                this.isSearching = false;
            },
            selectMyTasks: function () {
                this.$emit('select-my-tasks');
            },
            setSearchBarLabel: function (val) {
                this.searchBarLabel = val;
            }
        },
        watch: {
            searchEntry: function (val) {
                this.$emit('search', val.split(" "));
            }
        }
    }
</script>