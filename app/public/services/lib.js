CircleBlvd.Services.lib = function ($http, $location) {
    var LabelRegex = /[:;,<> \\\{\[\(\!\?\.\`\'\"\*\)\]\}\/]/;
    var ReplaceLabelRegex = /[#:;,<> \\\{\[\(\!\?\.\`\'\"\*\)\]\}\/]/g;

    var signIn = function (user, callback) {
        var xsrf = $.param(user);
        var request = {
            method: 'POST',
            url: '/auth/signin',
            data: xsrf,
            headers: {'Content-Type': 'application/x-www-form-urlencoded'}
        };      

        $http(request)
        .success(function (user, status) {
            callback(null, user);
        })
        .error(function (data, status) {
            var err = new Error(data)
            err.status = status;
            callback(err);
        });
    };

    // TODO: Rename?
    var goHome = function (user, session, callback) {
        var defaultGroup = undefined;

        var onCircleFound = function (circle) {
            var defaultCircle = "1";
            session.activeCircle = circle || defaultCircle;
            session.user = user;
            session.save();

            if (session.lastLocationPath) {
                $location.path(session.lastLocationPath);
                callback();
            }
            else {
                $location.path("/");
                callback();
            }
        };

        if (user.memberships && user.memberships.length > 0) {
            var membershipIndex = 0;

            // Find the first group we're a part of that has a
            // circle associated with it, and that's our default circle.
            var tryToFindGroupStartingAtIndex = function (index) {
                defaultGroup = user.memberships[index].group;

                $http.get('/data/group/' + defaultGroup)
                .success(function (group) {
                    if (group.projectId) {
                        onCircleFound(group.projectId);
                    }
                    else {
                        index++;
                        if (index < user.memberships.length) {
                            tryToFindGroupStartingAtIndex(index);
                        }
                        else {
                            // There are no circles!
                            onCircleFound(null);
                        }
                    }
                })
                .error(function () {
                    var err = new Error("Sorry, the server failed to get your circle.");
                    callback(err);
                });
            };

            tryToFindGroupStartingAtIndex(0);
        }
        else {
            callback(null);
        }
    };

    return {
        signIn: signIn,
        goHome: goHome,
        consts: {
            ReplaceLabelRegex: ReplaceLabelRegex,
            LabelRegex: LabelRegex
        }
    };
};
CircleBlvd.Services.lib.$inject = ['$http', '$location'];