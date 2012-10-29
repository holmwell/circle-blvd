var express  = require('express');
var request  = require('request');

var app = express();
var localfile = express.static(__dirname + '/app');
// configure Express
app.configure(function() {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.logger());
  app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.session({ secret: 'what? ok!' }));
// Initialize Passport!  Also use passport.session() middleware, to support
// persistent login sessions (recommended).
//  app.use(passport.initialize());
//  app.use(passport.session());
  app.use(app.router);
  app.use(localfile);
});

var usersExist = function() {
	return false;
};


app.get("/", function(req, res) {
	if (!usersExist()) {
		res.redirect('/client/#/config');
	}
	else {
		localfile(req, res);
	}
});

app.listen(80);