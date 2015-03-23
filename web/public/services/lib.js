CircleBlvd.Services.lib = function ($http) {

    var LabelRegex = /[:;,<> \\\{\[\(\!\?\.\`\'\"\*\)\]\}\/]/;
    var ReplaceLabelRegex = /[#:;,<> \\\{\[\(\!\?\.\`\'\"\*\)\]\}\/]/g;

    var signIn = function (email, password, callback) {
        var user = {
            email: email,
            password: password
        };
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

    var mindset = function () {
        var mindset = 'detailed';
        return {
            get: function () {
                return mindset;
            },
            set: function (m) {
                mindset = m;
            },
            is: function (m) {
                return m === mindset;
            }
        }
    }();

    var copiedTasks = [];
    var setCopiedTasks = function (tasks) {
        copiedTasks = [];
        if (tasks) {
            tasks.forEach(function (task) {
                copiedTasks.push(task);
            });
        }
    };

    var getCopiedTasks = function () {
        return copiedTasks;
    };

    return {
        signIn: signIn,
        consts: {
            ReplaceLabelRegex: ReplaceLabelRegex,
            LabelRegex: LabelRegex
        },
        mindset: mindset,
        setCopiedTasks: setCopiedTasks,
        getCopiedTasks: getCopiedTasks
    };
};
CircleBlvd.Services.lib.$inject = ['$http'];