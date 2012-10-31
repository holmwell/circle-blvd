var express  = require('express');
var request  = require('request');
var auth = require('./lib/auth.js');
var db = require('./lib/dataAccess.js').instance();

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
  app.use(auth.initialize());
  app.use(auth.session());
  app.use(app.router);
  app.use(localfile);
});


// TODO: Read if we can add something like this to specify which
// paths are protected behind the auth wall. 
//
// app.all('*', requireAuthentication)
// app.all('*', loadUser);

var usersExist = function() {
	return db.users.count() > 0;
};


// Redirect to 'initialize' on first-time use.
app.get("/", function(req, res) {
	if (!usersExist()) {
		res.redirect('/client/#/initialize');
	}
	else {
		res.redirect('/client/');
	}
});

// Authentication
app.post('/login', auth.authenticate('/login'), function(req, res) {
    res.redirect('/');
});

// Data API: First-time configuration
app.put("/data/initialize", function(req, res) {
  var data = req.body;
  var user = {
    email: data.email,
    id: db.users.count() + 1
  };

  db.users.add(
    user,
    "admin",
    function() {
      // Success.
      res.send("Ok!");
    },
    function(error) {
      // Fail.
      res.send(500, error);
    }
  );
});

// Data API: Protected by authorization system
app.get("/data/user", auth.ensure, function(req, res) {
	res.send(req.user);
});



app.listen(8080);

