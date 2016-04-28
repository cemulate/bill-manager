var express = require('express');

var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

var cookieParser = require('cookie-parser');
var session = require('express-session');
var bodyParser = require('body-parser');

var Datastore = require('nedb');

var bcrypt = require('bcrypt-nodejs');

var _ = require('underscore');

var path = require('path');

app = express();

// Connect to databases
var prefix = process.env.OPENSHIFT_DATA_DIR || '';
var usersdb = new Datastore({filename: path.join(prefix, 'users.db')});
var groupsdb = new Datastore({filename: path.join(prefix, 'groups.db')});
var billsdb = new Datastore({filename: path.join(prefix, 'bills.db')});
usersdb.loadDatabase();
groupsdb.loadDatabase();
billsdb.loadDatabase();
usersdb.persistence.setAutocompactionInterval(60000);
groupsdb.persistence.setAutocompactionInterval(60000);
billsdb.persistence.setAutocompactionInterval(60000);

// Configure passport

// Persist just the user's id
passport.serializeUser((user, done) => {
	done(null, user._id);
});

passport.deserializeUser((id, done) => {
	// Lookup user by id
	usersdb.find({_id: id}, (err, docs) => {
		done(null, docs[0]);
	});
});

passport.use(new LocalStrategy({
	usernameField: 'email',
	passwordField: 'password'
}, (email, password, done) => {

	usersdb.findOne({email: email}, (err, user) => {
		if (!user) {
			done(null, false, {error: 'User does not exist'});
			return;
		}
		// May have email in the system, but never registered for an account (no password):
		if (!user.phash) {
			done(null, false, {error: 'User does not exist'});
			return;
		}
		if (bcrypt.compareSync(password, user.phash)) {
			done(null, user);
			return;
		}
		done(null, false, {error: 'Incorrect password'});
	});

}));

// Stack middleware

// Standard express middleware for parsing the request data into req.body
app.use(bodyParser.urlencoded());
app.use(cookieParser());


// Configure sessions
app.use(session({
	secret: 'gfslieVZugRnpzkDWu1XkQwgf6iJVRpXwsMOsmBoi8t50e012C6k9cajNVt5zJT',
	resave: true,
	saveUninitialized: true
}));

// Install the passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Routing middleware

// Log in to a user account
// request parameters: {user}
app.post('/login', passport.authenticate('local'), (req, res, next) => {
	res.send(req.user);
});

// Log out
app.get('/logout', (req, res, next) => {
	req.logout();
	res.redirect('/');
});

// Register a new user by email
// request parameters: {email, password, name}
app.post('/register', (req, res, next) => {
	usersdb.findOne({email: req.body.email}, (err, user) => {
		if (!user) {
			usersdb.insert({email: req.body.email, phash: bcrypt.hashSync(req.body.password), name: req.body.name});
			res.send("OK");
		} else if (!user.phash) {
			// Email already in system, but never registered
			usersdb.update({_id: user._id}, {email: req.body.email, phash: bcrypt.hashSync(req.body.password), name: req.body.name}, {}, (err, ur) => {
				res.send("OK");
			});
		} else {
			res.status(400).send("User already exists");
		}
	});
});

app.post('/registerTemp', (req, res, next) => {
	usersdb.findOne({email: req.body.email}, (err, user) => {
		if (!user) {
			usersdb.insert({email: req.body.email, name: req.body.email}, (err, newUser) => {
				res.send(newUser._id);
			});
		} else {
			res.status(400).send("User already exists");
		}
	});
})

// Halts the request passing through with a 401 if there is no user logged in
var auth = (req, res, next) => {
	if (req.user) {
		console.log("Authenticated request from ", req.user.email);
		return next();
	} else {
		res.status(401).send("Must login");
	}
};

// Get the current user
app.get('/login', auth, (req, res, next) => {
	res.send(req.user);
});

// Get up to 10 users whose name contains 'name'
app.get('/users/:name', auth, (req, res, next) => {
	usersdb.find({$where: function() {return this.name.indexOf(req.params.name) > -1}}).limit(10).exec((err, results) => {
		res.send(results);
	});
});

// Make a user a member of a group
// request parameters: {userId, groupId}
app.post('/users/', auth, (req, res, next) => {
	groupsdb.update({_id: req.body.groupId}, {$addToSet: {members: req.body.userId}}, {}, (err, ur) => {
		res.send("OK");
	});
});

// Update a user
// request parameters: {id, update (object containing the same fields as POST to /register)}
app.put('/users/', auth, (req, res, next) => {

	usersdb.findOne({_id: req.body.id}, (err, user) => {
		var replacement = user;
		if (req.body.update.name) replacement.name = req.body.update.name;
		if (req.body.update.email) replacement.email = req.body.update.email;
		if (req.body.update.password) replacement.phash = bcrypt.hashSync(req.body.update.password);

		usersdb.update({_id: req.body.id}, replacement, {}, (err, ur) => {
			if (err) return res.status(500).send("Error updating user");
			res.send("OK");
		});
	});
});

// Returns groups for which the currently logged in user is a member
app.get('/groups', auth, (req, res, next) => {
	groupsdb.find({$where: function() {return this.members.indexOf(req.user._id) > -1}}, (err, groups) => {
		if (err) return res.status(500).status("Database lookup error");
		res.send(groups);
	});
});


// Create a new group
// request parameters: {<group parameters>}
app.post('/groups', auth, (req, res, next) => {
	groupsdb.insert(req.body, (err, nr) => {
		if (err) return res.status(500).send("Error adding group");
		res.send("OK");
	});
});

// Update a group
// request parameters: {id, newGroup}
app.put('/groups', auth, (req, res, next) => {
	groupsdb.update({_id: req.body.id}, req.body.newGroup, {}, (err, ur) => {
		if (err) return res.status(500).send("Error updating group");
		res.send("OK");
	});
});

// Delete a group
// request parameters: {id}
app.delete('/groups', auth, (req, res, next) => {
	groupsdb.remove({_id: req.body.id}, {}, (err, nr) => {
		if (err) return res.status(500).send("Error deleting group");
		res.send("OK");
	});
});

// Get the bills associated with the group of id 'groupId'
app.get('/bills/:groupId', auth, (req, res, next) => {
	billsdb.find({owner: req.params.groupId}).sort({date: -1}).exec((err, bills) => {
		res.send(bills);
	});
});

// Create a new bill
// request parameters: {<bill parameters>}
app.post('/bills', auth, (req, res, next) => {
	billsdb.insert(req.body);
	res.send("OK");
});

// Update a bill
// request parameters: {id, replacement}
app.put('/bills', auth, (req, res, next) => {
	billsdb.update({_id: req.body.id}, req.body.replacement, {}, (err, ur) => {
		if (err) return res.status(500).send("Error updating bill");
		res.send("OK");
	});
})

// Delete a bill
// request parameters: {id}
app.delete('/bills', auth, (req, res, next) => {
	billsdb.remove({_id: req.body.id}, {}, (err, nr) => {
		if (err) return res.status(500).send("Error deleting bill");
		res.send("OK");
	});
});

// Get the users that are responsible for paying the bill with id 'billId'
app.get('/payers/:billId', auth, (req, res, next) => {
	billsdb.find({_id: req.params.billId}, (err, bills) => {
		usersdb.find({_id: {$in: bills[0].payers}}, (err, users) => {
			res.send(users);
		});
	});
});

// Get the members of the group with id 'groupId'
app.get('/members/:groupId', auth, (req, res, next) => {
	groupsdb.find({_id: req.params.groupId}, (err, groups) => {
		if (!groups[0]) {
			res.status(500).send("Error retrieving group members");
			return;
		}
		usersdb.find({_id: {$in: groups[0].members}}, (err, users) => {
			res.send(users);
		});
	});
});


// Finally, serve static files from the 'static' directory
app.use(express.static('static'));

var serverPort = process.env.OPENSHIFT_NODEJS_PORT || 8000;
var serverIPAddress = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1';

// Launch the app
app.listen(serverPort, serverIPAddress, () => {
	console.log('Server running');
});
