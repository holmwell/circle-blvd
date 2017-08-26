// js-client-manifest.js
//
// The list of JavaScript files used by the front-end
// server. These are the files that are minified and
// compacted together and sent to the client as one
// big file.
//
module.exports = {
    lib: [
        'lib/angular/angular.js',
        'lib/angular/angular-route.js',
        'lib/angular/angular-sanitize.js',
        'lib/store/store.min.js',
        'lib/autosize/jquery.autosize.min.js'
    ],
    app: [
        'app.js'
    ],
    services: [
        'services/module.js',
        'services/analytics.js',
        'services/mouse.js',
        'services/lib.js',
        'services/clipboard.js',
        'services/hacks.js',
        'services/signInName.js',
        'services/session.js',
        'services/stories.js',
        'services/errors.js'
    ],
    controllers: [
        'ui/controllers/topLevel.js',
        'ui/controllers/initialize.js',
        'ui/controllers/storySummary.js',
        'ui/controllers/roadmapMilepost.js',
        'ui/controllers/home.js',
        'ui/controllers/welcome.js',
        'ui/controllers/signin.js',
        'ui/controllers/forgot.js',
        'ui/controllers/archive.js',
        'ui/controllers/lists.js',
        'ui/controllers/listDetail.js',
        'ui/controllers/profile.js',
        'ui/controllers/invite.js',
        'ui/controllers/tour.js',
        'ui/controllers/contact.js',
        'ui/controllers/partner.js',
        'ui/controllers/about.js',
        'ui/controllers/privacy.js',
        'ui/controllers/donate.js',
        'ui/controllers/admin.js',
        'ui/controllers/createCircle.js',
        'ui/controllers/removeHash.js',
        'ui/controllers/mainframe.js',
        'ui/controllers/fix.js'
    ],
    directives: [
        'ui/directives/module.js',
        'ui/directives/appendLinky.js',
        'ui/directives/autosize.js',
        'ui/directives/cbDragAndDrop.js',
        'ui/directives/cbHighlightedStories.js',
        'ui/directives/cbStoryListBuilder.js',
        'ui/directives/cbStoryPulser.js',
        'ui/directives/cbViewportObserver.js',
//      'ui/directives/spSortableListWrapper.js', // Loaded via webpack
        'ui/directives/spStory.js',
        'ui/directives/spStoryList.js',
        'ui/directives/spStorySummary.js',
        'ui/directives/spRoadmapMilepost.js'
    ],
    filters: [
        'ui/filters/module.js',
        'ui/filters/interpolate.js',
        'ui/filters/reverse.js',
        'ui/filters/slice.js'
    ]
};