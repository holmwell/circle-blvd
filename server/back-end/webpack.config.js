module.exports = function () {
    var path = require('path');

    var outputPath = '/_dist';
    // All of our Vue stuff is in the story list
    var appEntry = "../front-end/public/ui/directives/spSortableListWrapper.js";
    var staticPath = path.join(__dirname, "../front-end/public");

    var fullOutputPath = path.join(staticPath, outputPath);

    var module = {
        rules: [{
            test: /\.vue$/,
            loader: 'vue-loader',
            options: {
              loaders: {
                // Since sass-loader (weirdly) has SCSS as its default parse mode, we map
                // the "scss" and "sass" values for the lang attribute to the right configs here.
                // other preprocessors should work out of the box, no loader config like this necessary.
                'scss': 'vue-style-loader!css-loader!sass-loader',
                'sass': 'vue-style-loader!css-loader!sass-loader?indentedSyntax',
                js: 'babel-loader'
              }
              // other vue-loader options go here
            }
        },
        {
            test: /\.(png|jpg|gif)$/,
            loader: 'file-loader',
            options: {
              name: '[name].[ext]?[hash]'
            }
        },
        {
            test: /\.svg$/,
            loader: 'svg-inline-loader'
        }]
    };

    var resolveLoader = {
        modules: [path.resolve(__dirname, '../node_modules')]
    };


    return [{
        stats: "errors-only",
        entry: path.join(__dirname, '../front-end/entry.js'),
        output: {
            path: path.join(staticPath, outputPath),
            filename: 'circle.js'
        },
        module: module,
        resolveLoader: resolveLoader
    },{
        entry: path.join(__dirname, appEntry),
        context: path.resolve(__dirname, "../front-end"),
        output: {
            path: path.join(staticPath, outputPath),
            filename: 'main.js'
        },
        module: module,
        resolveLoader: resolveLoader
    }];
}();