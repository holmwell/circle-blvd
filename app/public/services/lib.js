CircleBlvd.Services.lib = function () {

    var LabelRegex = /[:;,<> \\\{\[\(\!\?\.\`\'\"\*\)\]\}\/]/;
    var ReplaceLabelRegex = /[#:;,<> \\\{\[\(\!\?\.\`\'\"\*\)\]\}\/]/g;

    return {
        consts: {
            ReplaceLabelRegex: ReplaceLabelRegex,
            LabelRegex: LabelRegex
        }
    };
};
CircleBlvd.Services.lib.$inject = [];