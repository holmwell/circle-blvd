var couch = require('./couch/couch.js');
couch.lists = require('./couch/lists.js');

module.exports = function () {
    return couch.lists;
}(); // closure
