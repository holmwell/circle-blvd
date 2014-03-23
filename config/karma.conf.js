module.exports = function(config){
    config.set({
    basePath : '../',

    files : [
      'app/public/js/lib/angular/angular.js',
      'app/public/js/lib/angular/angular-*.js',
      'test/lib/angular/angular-mocks.js',
      'app/public/js/**/*.js',
      'test/unit/**/*.js'
    ],

    exclude : [
      'app/public/js/lib/angular/angular-loader.js',
      'app/public/js/lib/angular/*.min.js',
      'app/public/js/lib/angular/angular-scenario.js'
    ],

    autoWatch : true,

    frameworks: ['jasmine'],

    browsers : ['Chrome'],

    plugins : [
            'karma-chrome-launcher',
            'karma-jasmine'
            ]
})}
