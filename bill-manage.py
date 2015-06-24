import os
from flask import Flask, request, jsonify
from flask.ext.login import LoginManager, UserMixin, login_required, login_user, current_user
from flask.ext.bcrypt import Bcrypt
import sqlite3 as sq

app = Flask(__name__)
app.secret_key = "A0Zr98j/3yX R~XHH!jmN]LWX/,?RT"

login = LoginManager()
login.init_app(app)

bcrypt = Bcrypt(app)

# Decorator to open/close a connection to the DB
def dbaccess(inner):
	def wrapper(*args, **kwargs):
		dbconn = sq.connect("main.db")
		c = dbconn.cursor()
		ret = inner(c, *args, **kwargs)
		dbconn.commit()
		dbconn.close()
		return ret
	wrapper.__name__ = "(dbaccess)" + inner.__name__
	return wrapper

@dbaccess
def ensureUsersExists(c):
	c.execute("DROP TABLE IF EXISTS Users")
	c.execute("CREATE TABLE IF NOT EXISTS Users(id integer primary key, email text, phash text)")
	
@dbaccess
def ensureBillsExists(c):
	c.execute("DROP TABLE IF EXISTS Bills")
	c.execute("CREATE TABLE IF NOT EXISTS Bills(id integer primary key, amount real)")
	
@dbaccess
def ensureUsersBillsXrefExists(c):
	c.execute("DROP TABLE IF EXISTS Users_Bills_Xref")
	c.execute("CREATE TABLE IF NOT EXISTS Users_Bills_Xref(user_id integer, bill_id integer, has_paid boolean)")

ensureUsersExists()
ensureBillsExists()
ensureUsersBillsXrefExists()

class User(UserMixin):
	
	def __init__(self, id, email, phash=None):
		self.id = id
		self.email = email
		self.phash = phash

	def get_id(self):
		return unicode(self.id)

@dbaccess
def getUserByEmail(c, email):
	c.execute("SELECT * FROM Users WHERE email=?", [email])
	result = c.fetchone()
	return User(*result)

@dbaccess
def getUserById(c, id):
	c.execute("SELECT * FROM Users WHERE id=?", [id])
	result = c.fetchone()
	return User(*result)


@login.user_loader
def load_user(id):
	return getUserById(id)

@app.route("/login", methods = ["POST"])
def login():
	email = request.form["email"]
	pword = request.form["password"]
	hash = bcrypt.generate_password_hash(pword)
	user = getUserByEmail(email)

	if (bcrypt.check_password_hash(user.phash, pword)):
		login_user(user)
		print "Login successful!"
	else:
		print "Invalid password!"
	
	return open("index.html", "rb").read()

@app.route("/signup", methods = ["POST"]) 
@dbaccess
def signup(c):
	if request.method == "POST":
		c.execute("INSERT INTO Users(email, phash) VALUES (?, ?)", [request.form["email"], bcrypt.generate_password_hash(request.form["password"])])
		return "OK"

@app.route("/state", methods=["GET"])
@dbaccess
def state(c):
	c.execute("SELECT * FROM Bills")
	bills = c.fetchall()
	bdata = []
	for b in bills:
		item = {}
		c.execute("SELECT user_id, has_paid FROM Users JOIN Users_Bills_Xref WHERE bill_id=?", [b[0]])
		results = c.fetchall()
		item['id'] = b[0]
		item['payers'] = list({'id': x[0], 'has_paid': x[1]} for x in results)
		bdata.append(item)
	return jsonify({'bills': bdata})

@app.route("/users", methods = ["GET", "PUT", "DELETE"])
@dbaccess
def users(c):
	if request.method == "GET":
		c.execute("SELECT id, email FROM Users")
		results = c.fetchall()
		return jsonify({'users': list({'id': x[0], 'email': x[1]} for x in results)})
	elif request.method == "PUT":
		c.execute("UPDATE Users SET email=? WHERE id=?", [request.form["email"], request.form["id"]])
		return "OK"
	elif request.method == "DELETE":
		c.execute("DELETE FROM Users WHERE id=?", [request.form["id"]])
		return "OK"

@app.route("/bills", methods = ["GET", "POST", "PUT", "DELETE"])
@dbaccess
def bills(c):
	if request.method == "GET":
		c.execute("SELECT id, amount FROM Bills")
		results = c.fetchall()
		return jsonify({"bills": list({'id': x[0], 'amount': x[1]} for x in results)})
	elif request.method == "POST":
		c.execute("INSERT INTO Bills VALUES(?)", [request.form["amount"]])
		return "OK"
	elif request.method == "PUT":
		c.execute("UPDATE Bills SET amount=? WHERE id=?", [request.form["amount"], request.form["id"]])
		return "OK"
	elif request.method == "DELETE":
		c.execute("DELETE FROM Bills WHERE id=?", [request.form["id"]])
		return "OK"

@app.route("/setpaid", methods = ["POST", "PUT", "DELETE"])
@dbaccess
def setpaid(c):
	if request.method == "POST":
		c.execute("INSERT INTO Users_Bills_Xref VALUES(?, ?)", [request.form["user_id"], request.form["bill_id"]])
		return "OK"
	elif request.method == "PUT":
		c.execute("UPDATE Users_Bills_Xref SET has_paid=? WHERE user_id=?, bill_id=?", [request.form["has_paid"], request.form["user_id"], request.form["bill_id"]])
		return "OK"
	elif request.method == "DELETE":
		c.execute("DELETE FROM Users_Bills_Xref WHERE bill_id=?, user_id=?", [request.form["user_id"], request.form["bill_id"]])
		return "OK"

@app.route("/")
def index():
    return open("index.html", "rb").read()
    
if __name__ == "__main__":
	app.run("127.0.0.1", 8000, True)