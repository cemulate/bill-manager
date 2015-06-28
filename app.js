var express         = require('express')

var passport        = require('passport');
var LocalStrategy   = require('passport-local').Strategy;

var cookieParser 	= require('cookie-parser');
var session        	= require('express-session');
var bodyParser 		= require('body-parser');

var Datastore		= require('nedb');

var bcrypt			= require('bcrypt-nodejs');

var _ 				= require('underscore');

app = express();

usersdb = new Datastore({filename: 'users.db'});
groupsdb = new Datastore({filename: 'groups.db'});
billsdb = new Datastore({filename: 'bills.db'});
usersdb.loadDatabase();
groupsdb.loadDatabase();
billsdb.loadDatabase();

// Configure passport

passport.serializeUser(function(user, done) {
	done(null, user._id);
});

passport.deserializeUser(function(id, done) {
	usersdb.find({_id: id}, function(err, docs) {
		done(null, docs[0]);
	});
});

passport.use(new LocalStrategy({
	usernameField: 'email',
	passwordField: 'password'
}, function(email, password, done) {

	usersdb.find({email: email}, function(err, docs) {
		if (!docs[0]) done(null, false, {error: 'User does not exist'});
		done(null, docs[0]);
	});

}));

// Stack middleware

app.use(bodyParser());
app.use(cookieParser());

app.use(session({
	// should be a large unguessable string
	secret: 'yoursecret'
}));

app.use(passport.initialize()); 
app.use(passport.session());

app.get('/hello', function(req, res, next) {
	if(req.user) {
		res.send("Hello " + req.user.email);
	} else {
		res.send("Hello unauthenticated user");
	}
});

app.post('/login', passport.authenticate('local'), function(req, res, next) {
	res.send(req.user);
});

app.post('/register', function(req, res, next) {
	usersdb.find({email: req.body.email}, function(err, docs) {
		if (!docs[0]) {
			usersdb.insert({email: req.body.email, phash: bcrypt.hashSync(req.body.password)});
			res.send("OK");
		} else {
			res.status(400).send("User already exists");
		}
	});
});

app.get('/login', function(req, res, next) {
	if (req.user) {
		res.send(req.user);
	} else {
		res.status(401).send("Must login");
	}
})

app.get('/users/:name', function(req, res, next) {
	usersdb.find({$where: function() {return this.name.indexOf(req.params.name) > -1}}).limit(10).exec(function(err, results) {
		res.send(results);
	});
});

app.post('/users/', function(req, res, next) {
	groupsdb.update({_id: req.body.groupId}, {$addToSet: {members: req.body.userId}}, {}, function(err, ur) {
		res.send("OK");
	});
});

// Group(name, members, bills[])
// Bill(name, amount, payers{id->boolean})

// Returns groups for which the current user is a member
app.get('/groups', function(req, res, next) {
	if (req.user) {
		groupsdb.find({$where: function() {return _.contains(this.members, req.user._id)}}, function(err, groups) {
			res.send(groups);
		});
	} else {
		res.status(401).send("Must login");
	}
});

app.post('/groups', function(req, res, next) {
	if (req.user) {
		groupsdb.insert(req.body, function(err, nr) {
			res.send("OK");
		});
	} else {
		res.status(401).send("Must login");
	}
});

app.put('/groups', function(req, res, next) {
	if (req.user) {
		groupsdb.update({_id: req.body.id}, req.body.newGroup, {}, function(err, ur) {
			res.send("OK");
		});
	} else {
		res.status(401).send("Must login");
	}
});

app.delete('/groups', function(req, res, next) {
	if (req.user) {
		groupsdb.remove({_id: req.body.id}, {}, function(err, nr) {
			res.send("OK");
		});
	} else {
		res.status(401).send("Must login");
	}
});

app.get('/bills/:groupId', function(req, res, next) {
	billsdb.find({owner: req.params.groupId}, function(err, bills) {
		res.send(bills);
	});
});

app.post('/bills', function(req, res, next) {
	billsdb.insert(req.body);
	res.send("OK");
});

app.put('/bills', function(req, res, next) {
	billsdb.update({_id: req.body.id}, req.body.replacement, {}, function(err, ur) {
		res.send("OK");
	});
})

app.delete('/bills', function(req, res, next) {
	billsdb.remove({_id: req.body.id}, {}, function(err, nr) {
		res.send("OK");
	});
});

app.get('/payers/:billId', function(req, res, next) {
	billsdb.find({_id: req.params.billId}, function(err, bills) {
		usersdb.find({_id: {$in: bills[0].payers}}, function(err, users) {
			res.send(users);
		});
	});
});

app.get('/members/:groupId', function(req, res, next) {
	groupsdb.find({_id: req.params.groupId}, function(err, groups) {
		usersdb.find({_id: {$in: groups[0].members}}, function(err, users) {
			res.send(users);
		});
	});
});

// app.post('/bills', function(req, res, next) {
// 	billsdb.insert(req.body, function(err, nr) {
// 		res.send("OK");
// 	});
// });

// app.put('/bills', function(req, res, next) {
// 	billsdb.update({_id: req.body.id}, req.body.newBill, {}, function(err, nr) {
// 		res.send("OK");
// 	});
// });

// app.delete('/bills', function(req, res, next) {
// 	billsdb.remove({_id: req.body.id}, {}, function(err, rm) {
// 		res.send("OK");
// 	});
// });

app.use(express.static('static'));

// Launch the app

app.listen(8000, function() {
	console.log('Server running at port 8000');
});