var isEmail = function(x) {
	return (/^[-a-z0-9~!$%^&*_=+}{\'?]+(\.[-a-z0-9~!$%^&*_=+}{\'?]+)*@([a-z0-9_][-a-z0-9_]*(\.[-a-z0-9_]+)*\.(aero|arpa|biz|com|coop|edu|gov|info|int|mil|museum|name|net|org|pro|travel|mobi|[a-z][a-z])|([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}))(:[0-9]{1,5})?$/i.test(x));
}

var partials = ["login", "register", "userEdit", "groups", "bills", "billsSidebar", "topBar"];
var templates = {};
var appTemplate = null;

var reqs = partials.map(t => {
	return $.get("/templates/" + t + ".html", r => {
		templates[t] = r;
	});
});
reqs.push($.get("/templates/app.html", r => {
	appTemplate = r;
}));

$(document).data("document-ready-deffered", $.Deferred()).ready(() => {
    $(document).data("document-ready-deffered").resolve();
});
reqs.push($(document).data("document-ready-deffered"));

$.when.apply(null, reqs).then(() => {

	// Setup Ractive

	var ractive = new Ractive({
		magic: false,
		el: 'appContainer',
		template: appTemplate,
		partials: templates,
		data: {
			moment: moment,					// Expose moment to ractive
			currentUser: null,				// Global user context

			registeredSuccessfully: false,	// Register partial

			editedUserSuccessfully: false,	// User Edit partial

			appState: "groups", 			// App partial {groups, userPage, register, ...}

			groups: [],						// Groups partial
			loadingGroups: false,

			currentGroup: null,				// Bills partial
			currentGroupMembers: null,
			currentBills: [],
			loadingBills: false,
			selectedBill: null,
			selectedUserId: "",

			userSearchResults: [],			// Add Member Modal partial

			reconcileTotal: 0,
		}
	});

	// Ractive helper functions

	// Grab the user name from a user id
	ractive.set("memberNameById", id => {
		var members = ractive.get("currentGroupMembers");
		if (members) {
			var user = members.find(member => (member._id == id));
			return user ? user.name : "";
		}
	});

	ractive.set("formatMoney", amountOrString => {
		return "$" + parseFloat(amountOrString).toFixed(2);
	});

	ractive.set("currentUserIsPayer", () => {
		var user = ractive.get("currentUser");
		var bill = ractive.get("selectedBill");
		return (bill.payers.find(x => (x.userId == user._id && x.paid == "owner"))) != null;
	})

	$(document).arrive("#loginForm", {onceOnly: false, existing: true}, () => {
		console.log("Initializing loginForm");
		$("#loginForm").submit(event => {
			var values = {};
			for (let field of $('#loginForm').serializeArray()) {
				values[field.name] = field.value;
			}
			values.email = values.email.toLowerCase();
			if (isEmail(values.email)) {
				$.post('/login', values, data => {
					ractive.set("currentUser", data);
				});
			}
			event.preventDefault();
		});
	});

	$(document).arrive("#registerForm", {onceOnly: false, existing: true}, () => {
		console.log("Initializing registerForm");
		$("#registerForm").submit(event => {
			var values = {};
			for (let field of $('#registerForm').serializeArray()) {
				values[field.name] = field.value;
			}
			values.email = values.email.toLowerCase();
			if (isEmail(values.email)) {
				if (values.password == values.passwordConfirm) {
					$.post('/register', values, data => {
						ractive.set("registeredSuccessfully", true);
					});
				}
			}
			event.preventDefault();
		});
	});

	$(document).arrive("#newBillForm", {onceOnly: false, existing: true}, () => {
		console.log("Initializing newBillForm");
		$("#newBillForm").submit(event => {
			var values = {};
			for (let field of $('#newBillForm').serializeArray()) {
				values[field.name] = field.value;
			}
			if ($.isNumeric(values.amount)) {
				values.owner = ractive.get("currentGroup._id");
				values.payers = [{
					userId: ractive.get("currentUser._id"),
					paid: "owner"
				}];
				values.date = new Date().getTime();
				$.post('/bills', values, data => {
					refreshBills();
				});
			}
			event.preventDefault();
		});
	});

	$(document).arrive("#newGroupForm", {onceOnly: false, existing: true}, () => {
		console.log("Initializing newGroupForm");
		$("#newGroupForm").submit(event => {
			var values = {};
			for (let field of $('#newGroupForm').serializeArray()) {
				values[field.name] = field.value;
			}
			values.members = [ractive.get("currentUser._id")];
			values.bills = [];
			$.post('/groups', values, data => {
				refreshGroups();
			});
			event.preventDefault();
		});
	});

	$(document).arrive("#userEditForm", {onceOnly: false, existing: true}, () => {
		console.log("Initializing userEditForm");
		$("#userEditForm").submit(event => {
			var values = {};
			for (let field of $('#userEditForm').serializeArray()) {
				values[field.name] = (field.value == "") ? null : field.value;
			}

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
					success: () => {
						ractive.set("editedUserSuccessfully", true);
						refreshCurrentUser();
					}
				});
			}
			event.preventDefault();
		});
	});

	// Request a user search by name
	var userSearch = function(name) {
		if (name == "") {
			ractive.set("userSearchResults", []);
		} else {
			$.get('/users/' + name, data => {
				ractive.set("userSearchResults", data);
			});
		}
	}

	// Trigger a user search when the user stops typing
	// https://github.com/dennyferra/TypeWatch
	$(document).arrive("#addMemberToGroupInput", {onceOnly: false, existing: true}, () => {
		$("#addMemberToGroupInput").typeWatch({
			callback: () => userSearch($("#addMemberToGroupInput").val()),
			wait: 200,
			highlight: true,
			captureLength: 0
		});
	});

	// Refresh the info for the currently logged in user
	var refreshCurrentUser = function() {
		$.get('/login')
			.done(data => ractive.set("currentUser", data))
			.fail((xhr, status, error) => ractive.set("currentUser", null));
	};

	var reFoundation = function() {
		setTimeout(() => {
			$(".foundation-plugin").hide();
			setTimeout(() => {
				$(".foundation-plugin").foundation();
				$(".foundation-plugin").show();
			}, 350);
		}, 100);
	};

	// See if a session exists; log in
	refreshCurrentUser();

	// Fetch the groups for the logged in user
	var refreshGroups = function() {
		ractive.set("loadingGroups", true);
		$.get('/groups', data => {
			ractive.set("groups", data);
			ractive.set("loadingGroups", false);
		});
	};

	// Fetch the bills for the current group
	var refreshBills = function() {
		if (ractive.get("currentGroup")) {
			$.get('/bills/' + ractive.get("currentGroup._id"), data => {
				ractive.set("currentBills", data);
				ractive.set("loadingBills", false);
			});
		} else {
			ractive.set("currentBills", []);
		}
	};

	var updateBills = function() {
		var bills = ractive.get("currentBills");
		for (let b of bills) {
			$.ajax('/bills', {
				method: "PUT",
				data: {
					id: b._id,
					replacement: b
				}
			});
		}
	};

	// Fetch the members of the current group
	var populateMembers = function() {
		$.get('/members/' + ractive.get("currentGroup._id"), data => {
			ractive.set("currentGroupMembers", data);
		});
	};

	var doReconcile = function(actuallyMarkPaid) {
		var bills = ractive.get("currentBills");

		var me = ractive.get("currentUser");
		var members = ractive.get("currentGroupMembers");
		var other = members ? members.find(x => x._id == ractive.get("selectedUserId")) : null;
		var owesOther = 0;

		if (!other || (me._id == other._id)) {
			ractive.set("reconcileTotal", 0);
			return;
		}

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
			ractive.set("reconcileTotal", owesOther);
		} else {
			ractive.set("reconcileTotal", 0);
			updateBills();
		}
	};

	// When the user logs in with a valid user, refresh the group list
	ractive.observe("currentUser", (newVal, oldVal, keypath) => {
		if (newVal) refreshGroups();
	});

	ractive.observe("selectedUserId", (newVal, oldVal, keypath) => doReconcile());

	// Delete a group
	ractive.on("deleteGroup", event => {
		$.ajax('/groups', {
			method: "DELETE",
			data: {
				id: event.context._id
			},
			success: refreshGroups
		});
	});

	// Delete a bill
	ractive.on("deleteBill", event => {
		$.ajax('/bills', {
			method: "DELETE",
			data: {
				id: event.context._id
			},
			success: refreshBills
		});
	});

	// Add a group member to a bill
	ractive.on("addGroupMemberToBill", event => {

		var bill = ractive.get("selectedBill");
		var toAdd = ractive.get("selectedUserId");
		var bIndex = ractive.get("currentBills").indexOf(bill);
		var payers = bill.payers;
		var payerIds = payers.map(x => x.userId);
		if (payerIds.indexOf(toAdd) == -1) {
			payers.push({
				userId: toAdd,
				paid: "false"
			});
			var setKeypath = "currentBills." + bIndex + ".payers";
			ractive.set(setKeypath, payers);

			$.ajax('/bills', {
				method: "PUT",
				data: {
					id: bill._id,
					replacement: bill
				}
			});
		}
	});

	ractive.on("removeGroupMemberFromBill", event => {
		var bill = ractive.get("selectedBill");
		var toRemove = ractive.get("selectedUserId");
		var bIndex = ractive.get("currentBills").indexOf(bill);
		var payers = bill.payers;
		var payerIds = payers.map(x => x.userId);
		var pIndex = payerIds.indexOf(toRemove);
		if (pIndex > -1) {
			if (payers[pIndex].paid == "owner") return;
			payers.splice(pIndex, 1);
			var setKeypath = "currentBills." + bIndex + ".payers";
			ractive.set(setKeypath, payers);

			$.ajax('/bills', {
				method: "PUT",
				data: {
					id: bill._id,
					replacement: bill
				}
			});
		}
	})

	// Add all the group members to a bill
	ractive.on("addAllMembersToBill", event => {
		var bill = ractive.get("selectedBill");

		for (let member of ractive.get("currentGroupMembers")) {
			if (bill.payers.map(x => x.userId).indexOf(member._id) == -1) {
				bill.payers.push({
					userId: member._id,
					paid: "false"
				});
			}
		}

		$.ajax('/bills', {
			method: "PUT",
			data: {
				id: bill._id,
				replacement: bill
			},
			success: refreshBills
		});
	});

	// Add a member to the current group
	ractive.on("addMemberToCurrentGroup", event => {
		var current = ractive.get("currentGroup").members;
		if (current.indexOf(event.context._id) == -1) {
			$.post('/users', {
				groupId: ractive.get("currentGroup._id"),
				userId: event.context._id
			}, () => {
				populateMembers();
				ractive.set("userSearchResults", []);
			});
		}
	});

	// Mark a user paid/not paid on a bill
	ractive.on("togglePaid", event => {
		if (event.context.paid == "owner") return;

		var current = (event.context.paid == "true");
		ractive.set(event.keypath + ".paid", (!current).toString());

		var components = event.keypath.split(".");
		var billKeypath = components.slice(0, 2).join(".");

		var bill = ractive.get(billKeypath);

		$.ajax('/bills', {
			method: "PUT",
			data: {
				id: bill._id,
				replacement: bill
			}
		});

		if (ractive.get("selectedUserId") == event.context.userId) doReconcile();

		event.original.stopPropagation();
	});

	ractive.on("reconcileAndResolve", event => doReconcile(true));
	ractive.on("selectBill", event => {
		var cur = ractive.get("selectedBill");
		if (cur && cur._id == event.context._id) {
			ractive.set("selectedBill", null);
		} else {
			ractive.set("selectedBill", event.context);
		}
	});

	// Configure routing

	var router = Router({

		'/': () => {
			ractive.set("appState", "groups");
			ractive.set("currentGroup", null);
		},

		'/groups/:groupId': groupId => {
			var g = ractive.get("groups").find(x => (x._id == groupId));
			ractive.set("appState", "groups");
			ractive.set("currentGroup", g);
			populateMembers();
			ractive.set("currentBills", []);
			ractive.set("loadingBills", true);
			refreshBills();
		},

		'/userPage': () => {
			ractive.set("appState", "userPage");
		},

		'/register': () => {
			ractive.set("appState", "register");
		}
	});

	router.init();
	router.setRoute("");

	refreshGroups();
	console.log(ractive);
});
