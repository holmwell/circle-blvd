function getStoryArray(dict, meta) {
  // Migrating from cbStoryListBuilder
  var first = dict[meta.firstStoryId];
  first.isFirstAtLoad = true;

  var array = [];
  var isAfterNextMeeting = false;

  var addAndGetNextStory = function (currentStory) {
    array.push(currentStory);

    if (isAfterNextMeeting) {
      currentStory.isAfterNextMeeting = true;
    }
    else if (currentStory.isNextMeeting) {                  
      isAfterNextMeeting = true;
    }

    var nextStoryId = currentStory.nextId;
    if (nextStoryId) {
      currentStory = dict[nextStoryId];
    }
    else {
      currentStory = undefined;
    }

    return currentStory;
  };


  var currentStory = first;

  while (currentStory) {
    currentStory = addAndGetNextStory(currentStory);
  }

  return array;
}

export default {
  getStoryArray
}
