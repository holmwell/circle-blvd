CircleBlvd.Services.lib = function ($http) {
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

    return {
        signIn: signIn,
        consts: {
            ReplaceLabelRegex: ReplaceLabelRegex,
            LabelRegex: LabelRegex
        }
    };
};
CircleBlvd.Services.lib.$inject = ['$http'];