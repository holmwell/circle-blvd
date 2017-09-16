// A story pulser will find stories in the
// DOM and animate their colors a bit, like
// a pulse.
// 
// We use jQuery to do this, as we've found
// Angular animations to be lacking. Feel
// free to rewrite things with Angular animations
// if that's your thing.
'use strict';

// Migration facade
function $timeout (fn, ms) {
    window.setTimeout(fn, ms);
};

    
var ensureSelector = function (selector) {
    if (!selector) {
        selector = "data-story-id";
    }
    return selector;
};

var pulse = function (story, selector) {
    var selector = ensureSelector(selector);

    var pulseClass = "pulse";
    if (story.isDeadline || story.isNextMeeting) {
        pulseClass = "pulse-milepost";
    }
    var qStory = $("[" + selector + "='" + story.id + "']");
    qStory = qStory.find('.story');

    if (qStory.hasClass(pulseClass)) {
        return;
    }

    // Use CSS to flash a different colored background
    // for a moment then fade to whatever we were.
    qStory.addClass(pulseClass);
    $timeout(function () {
        qStory.addClass('color-transition');    
    }, 10);
    
    $timeout(function () { 
        qStory.removeClass(pulseClass);
        $timeout(function () {
            qStory.removeClass('color-transition');
        }, 500);
    }, 25); 
};

var scrollToAndPulse = function (story, selector, onlyDirection) {
    var qStory = $("[" + selector + "='" + story.id + "']");
    qStory = qStory.find('.story');
    if (!qStory) {
        return;
    }

    var shouldScroll = true;
    if (onlyDirection === "up") {
        var bodyScrollTop = $('body').prop('scrollTop');        
        if (bodyScrollTop < qStory.offset().top) {
            shouldScroll = false;
        }
    }

    if (shouldScroll) {
        var delay = 500;
        // Give the story time to close before
        // starting the scroll animation.
        $timeout(function () {
            $('body').animate({
                // scrollTopWhenSelected
                scrollTop: qStory.offset().top - 20
            }, delay);

            $timeout(function () {
                pulse(story);
            }, delay + 75);
        }, 100);
    }
    else {
        pulse(story);
    }
};

export default {
    pulse: pulse,
    scrollToAndPulse: function (story, selector, onlyDirection) {
        selector = ensureSelector(selector);
        scrollToAndPulse(story, selector, onlyDirection);
    }
}