var templates = [];

$.when(

	// Grab the main Ractive template

	$.get("/templates/app.html", function(t) {
		templates.app = t;
	}),
	$.get("/templates/login.html", function(t) {
		templates.login = t;
	}),
	$.get("/templates/register.html", function(t) {
		templates.register = t;
	}),
	$.get("/templates/userEdit.html", function(t) {
		templates.userEdit = t;
	}),
	$.get("/templates/topBar.html", function(t) {
		templates.topBar = t;
	}),
	$.get("/templates/groups.html", function(t) {
		templates.groups = t;
	}),
	$.get("/templates/bills.html", function(t) {
		templates.bills = t;
	}),
	$.get("/templates/addMemberModal.html", function(t) {
		templates.addMemberModal = t;
	}),
	$.get("/templates/reconcileModal.html", function(t) {
		templates.reconcileModal = t;
	})

).then(function () {

	// Setup Ractive

	ractive = new Ractive({
		magic: false,
		el: 'appContainer',
		template: templates.app,
		partials: {
			login: templates.login, 
			register: templates.register,
			userEdit: templates.userEdit,
			topBar: templates.topBar,
			groups: templates.groups, 
			bills: templates.bills, 
			addMemberModal: templates.addMemberModal, 
			reconcileModal: templates.reconcileModal
		},
		data: {

			// Expose libraries/things to ractive templates
			moment: moment,

			// (Common to all partials)
			currentUser: null,

			// Register partial
			registeredSuccessfully: false,

			// User Edit partial
			editedUserSuccessfully: false,

			// App partial
			appState: "groups", // {groups, userPage, register, ...}

			// Groups partial
			groups: [],
			loadingGroups: false,

			// Bills partial
			currentGroup: null,
			currentGroupMembers: null,
			currentBills: [],
			loadingBills: false,

			// Add Member Modal partial
			userSearchResults: [],

			// Reconcile Modal partial
			reconcileData: null,
		}
	});

	// Ractive helper functions

	// Grab the user name from a user id
	ractive.set("memberNameById", function(id) {
		var members = ractive.get("currentGroupMembers");
		if (members) {
			var user = _.find(members, function(member) {return member._id == id});
			if (user) {
				return user.name;
			} else {
				return "";
			}
		}
	});

	// An awful hack because Ractive doesn't allow access to the parent scope inside a section (#)
	ractive.set("dropdownDataForBill", function(billId) {
		if (!billId) return {};
		var bill = _.find(this.get("currentBills"), function(x) {return x._id == billId});
		var currentGroupMembers = this.get("currentGroupMembers");
		var data = [];
		_.each(currentGroupMembers, function(gm) {
			if (_.indexOf(_.map(bill.payers, function(x) {return x._id}), gm._id) == -1) {
				data.push({
					billId: bill._id,
					userId: gm._id,
					name: gm.name
				});
			}
		});
		return data;
	});

	ractive.set("formatMoney", function(amountOrString) {
		return "$" + parseFloat(amountOrString).toFixed(2);
	});

	// AJAX form submission

	$(document).on("submit", "#loginForm", function(event) {
		values = {};
		$.each($('#loginForm').serializeArray(), function(i, field) {
			values[field.name] = field.value;
		});
		values.email = values.email.toLowerCase();
		if (util.isEmail(values.email)) {
			$.post('/login', values, function(data) {
				ractive.set("currentUser", data);
			});
		}
		event.preventDefault();
	});

	$(document).on("submit", "#registerForm", function(event) {
		values = {}
		$.each($('#registerForm').serializeArray(), function(i, field) {
			values[field.name] = field.value;
		});
		values.email = value.email.toLowerCase();
		if (util.isEmail(values.email)) {
			if (values.password == values.passwordConfirm) {
				$.post('/register', {
					name: values.name,
					email: values.email,
					password: values.password
				}, function(data) {
					ractive.set("registeredSuccessfully", true);
				});
			}
		}
		event.preventDefault();
	});

	$(document).on("submit", "#newBillForm", function(event) {
		values = {}
		$.each($('#newBillForm').serializeArray(), function(i, field) {
			values[field.name] = field.value;
		});
		if ($.isNumeric(values.amount)) {
			values.owner = ractive.get("currentGroup._id");
			values.payers = [{
				userId: ractive.get("currentUser._id"),
				paid: "owner"
			}];
			values.date = new Date().getTime();
			$.post('/bills', values, function(data) {
				refreshBills();
			});
		}
		event.preventDefault();
	});

	$(document).on("submit", "#newGroupForm", function(event) {
		values = {}
		$.each($('#newGroupForm').serializeArray(), function(i, field) {
			values[field.name] = field.value;
		});
		values.members = [ractive.get("currentUser._id")];
		values.bills = [];
		$.post('/groups', values, function(data) {
			refreshGroups();
		});
		event.preventDefault();
	});

	$(document).on("submit", "#userEditForm", function(event) {
		values = {}
		$.each($('#userEditForm').serializeArray(), function(i, field) {
			values[field.name] = (field.value == "") ? null : field.value;
		});
		
		var replacement = {};
		if (values.name) replacement.name = values.name;
		if (values.email) replacement.email = values.email;
		if (values.password) replacement.password = values.password;

		if (values.password == values.passwordConfirm) {
			$.ajax('/users', {
				method: "PUT",
				data: {
					id: ractive.get("currentUser._id"),
					update: replacement			
				},
				success: function() {
					ractive.set("editedUserSuccessfully", true);
					refreshCurrentUser();
				}
			});
		}
		event.preventDefault();
	});

	// Request a user search by name
	var userSearch = function(name) {
		$.get('/users/' + name, function(data) {
			ractive.set("userSearchResults", data);
		});
	}

	// Trigger a user search when the user stops typing
	// https://github.com/dennyferra/TypeWatch
	$("#addMemberModalInput").typeWatch({
		callback: function () {
			userSearch($("#addMemberModalInput").val());
		},
		wait: 200,
		highlight: true,
		captureLength: 0
	});

	// Refresh the info for the currently logged in user
	var refreshCurrentUser = function() {
		$.get('/login').done(function (data) {
			ractive.set("currentUser", data);
		}).fail(function (xhr, status, error) {
			ractive.set("currentUser", null);
		});
	};

	// See if a session exists; log in
	refreshCurrentUser();

	// Fetch the groups for the logged in user
	var refreshGroups = function() {
		ractive.set("loadingGroups", true);
		$.get('/groups', function(data) {
			ractive.set("groups", data);
			ractive.set("loadingGroups", false);
		});
	};

	// Fetch the bills for the current group
	var refreshBills = function() {
		if (ractive.get("currentGroup")) {
			$.get('/bills/' + ractive.get("currentGroup._id"), function(data) {
				ractive.set("currentBills", data);
				// Re-foundation the document so newly rendered JS dropdowns will work ~10ms later (this is dirty af help pls)
				_.debounce(function() { $(document).foundation(); }, 100)();
				ractive.set("loadingBills", false);
			});
		} else {
			ractive.set("currentBills", []);
		}
	};

	var updateBills = function() {
		var bills = ractive.get("currentBills");
		_.each(bills, function(b) {
			$.ajax('/bills', {
				method: "PUT",
				data: {
					id: b._id,
					replacement: b
				}
			});
		});
	}

	// Fetch the members of the current group
	var populateMembers = function() {
		$.get('/members/' + ractive.get("currentGroup._id"), function(data) {
			ractive.set("currentGroupMembers", data);
		});
	};

	// When the user logs in with a valid user, refresh the group list
	ractive.observe("currentUser", function(newVal, oldVal, keypath) {
		if (this.get("currentUser")) {
			refreshGroups();
		}
	});

	// Delete a group
	ractive.on("deleteGroup", function(event) {
		$.ajax('/groups', {
			method: "DELETE",
			data: {
				id: event.context._id
			},
			success: function(data) {
				refreshGroups();
			}
		});
	});

	// Delete a bill
	ractive.on("deleteBill", function(event) {
		$.ajax('/bills', {
			method: "DELETE",
			data: {
				id: event.context._id
			},
			success: function(data) {
				refreshBills();
			}
		});
	});

	// Add a group member to a bill
	ractive.on("addGroupMemberToBill", function(event) {

		// Event context: {userId, billId, name} because of dropdownContentForBill hack (eeeeuuuughh)

		var bill = _.find(this.get("currentBills"), function(bill) { return bill._id == event.context.billId; });
		var bIndex = _.indexOf(this.get("currentBills"), bill);
		var payers = bill.payers;
		var payerIds = _.map(payers, function(x) {return x.userId});
		if (!_.contains(payerIds, event.context.userId)) {
			payers.push({
				userId: event.context.userId,
				paid: "false"
			});
			var setKeypath = "currentBills." + bIndex + ".payers";
			this.set(setKeypath, payers);

			$.ajax('/bills', {
				method: "PUT",
				data: {
					id: bill._id,
					replacement: bill
				}
			});
		}
	});

	// Add all the group members to a bill
	ractive.on("addAllMembersToBill", function(event) {
		var bill = event.context;

		_.each(this.get("currentGroupMembers"), function(member) {
			if (!_.contains(_.map(bill.payers, function(x) {return x.userId}), member._id)) {
				bill.payers.push({
					userId: member._id,
					paid: "false"
				});
			}
		});

		$.ajax('/bills', {
			method: "PUT",
			data: {
				id: bill._id,
				replacement: bill
			},
			success: function(data) {
				refreshBills();
			}
		});
	});

	// Add a member to the current group
	ractive.on("addMemberToCurrentGroup", function(event) {
		var current = this.get("currentGroup").members;
		if (!_.contains(current, event.context._id)) {
			$.post('/users', {
				groupId: this.get("currentGroup._id"),
				userId: event.context._id
			}, function(data) {
				populateMembers();
			});
		}
		$("#addMemberModal").foundation("reveal", "close");
	});

	ractive.on("addUnregisteredMemberToCurrentGroup", function(event) {
		var email = $("#addUnregisteredMemberModalInput").val();
		if (!util.isEmail(email)) {
			ractive.set("emailInvalid", true);
			return;
		}
		$.post('/registerTemp', {email: email}, function(newUserId) {
			$.post('/users', {
				groupId: ractive.get("currentGroup._id"),
				userId: newUserId
			}, function(data) {
				populateMembers();
			});
		});
		$("#addMemberModal").foundation("reveal", "close");
	});

	// Mark a user paid/not paid on a bill
	ractive.on("togglePaid", function(event) {
		if (event.context.paid == "owner") return;
		
		var current = (event.context.paid == "true");
		this.set(event.keypath + ".paid", (!current).toString());

		var components = event.keypath.split(".");
		var billKeypath = components.slice(0, 2).join(".");

		var bill = this.get(billKeypath);

		$.ajax('/bills', {
			method: "PUT",
			data: {
				id: bill._id,
				replacement: bill
			}
		});
	});

	ractive.on("clearReconcileData", function(event) {
		this.set("reconcileData", null);
	});

	ractive.on("reconcileWith", function(event, actuallyMarkPaid) {
		var bills = ractive.get("currentBills");

		var me = ractive.get("currentUser");
		var other = actuallyMarkPaid ? ractive.get("reconcileData.otherUser") : event.context;
		var owesOther = 0;

		for (var i = 0; i < bills.length; i ++) {
			var b = bills[i];

			var splitAmount = (parseFloat(b.amount) / b.payers.length);

			var otherIndex = -1;
			var meIndex = -1;
			for (var j = 0; j < b.payers.length; j ++) {
				if (b.payers[j].userId == me._id) meIndex = j;
				if (b.payers[j].userId == other._id) otherIndex = j;
			}

			if (otherIndex == -1 || meIndex == -1) continue;

			var otherPaid = b.payers[otherIndex].paid;
			var mePaid = b.payers[meIndex].paid;
			
			// If the other user isn't on this bill, nothing to do
			if (!otherPaid) continue;

			if (mePaid == "owner") {
				// I'm responsible for this bill
				if (!(otherPaid == "true")) {
					// And the other user hasn't paid. He owes me.
					owesOther -= splitAmount;
					if (actuallyMarkPaid) {
						// Actually reconcile by marking him as paid
						ractive.set("currentBills." + i + ".payers." + otherIndex + ".paid", "true");
					}
				}
			} else if (otherPaid == "owner") {
				// The other user was the one responsible for this bill
				if (!(mePaid == "true")) {
					// And I haven't paid. I owe him.
					owesOther += splitAmount;
					if (actuallyMarkPaid) {
						// Actually reconcile by marking me as paid
						ractive.set("currentBills." + i + ".payers." + meIndex + ".paid", "true");
					}
				}
			}
		}

		if (!actuallyMarkPaid) {
			// Just set the reconcile data
			this.set("reconcileData", {
				otherUser: other,
				owesOther: owesOther
			});
		} else {
			updateBills();
			this.set("reconcileData", null);
			$("#reconcileModal").foundation("reveal", "close");
		}
	});

	// Configure routing

	var router = Router({
		
		'/': function() {
			ractive.set("appState", "groups");
			ractive.set("currentGroup", null);
		},

		'/groups/:groupId': function(groupId) {
			var g = _.find(ractive.get("groups"), function(x) {return x._id == groupId});
			ractive.set("appState", "groups");
			ractive.set("currentGroup", g);
			populateMembers();
			ractive.set("currentBills", []);
			ractive.set("loadingBills", true);
			refreshBills();
		},

		'/userPage': function() {
			ractive.set("appState", "userPage");
			window.setTimeout(function() { $(document).foundation(); }, 100);
		},

		'/register': function() {
			ractive.set("appState", "register");
			window.setTimeout(function() { $(document).foundation(); }, 100);
		}

	});

	router.init();

	router.setRoute("");

	refreshGroups();

});