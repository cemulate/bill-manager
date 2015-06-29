var appTemplate = null;

$.when(

	// Grab the main Ractive template

	$.get("/appTemplate.html", function(t) {
		appTemplate = t;
	})

).then(function () {

	ractive = new Ractive({
		magic: false,
		el: 'appContainer',
		template: appTemplate,
		data: {
			currentUser: null,
			currentGroup: null,
			currentGroupMembers: null,
			currentBills: [],
			groups: [],
			userSearchResults: [],

			moment: moment // Give templates access to moment
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

	ractive.set("formatMoney", function(amountString) {
		return "$" + parseInt(amountString).toFixed(2);
	})

	// AJAX form submission

	$(document).on("submit", "#loginForm", function(event) {
		$.post('/login', $("#loginForm").serialize(), function(data) {
			ractive.set("currentUser", data);
		});
		event.preventDefault();
	});

	$(document).on("submit", "#newBillForm", function(event) {
		values = {}
		$.each($('#newBillForm').serializeArray(), function(i, field) {
			values[field.name] = field.value;
		});
		values.owner = ractive.get("currentGroup._id");
		values.payers = [{
			userId: ractive.get("currentUser._id"),
			paid: "owner"
		}];
		values.date = new Date().getTime();
		$.post('/bills', values, function(data) {
			refreshBills();
		});
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

	// See if a session exists; log in
	$.get('/login').done(function (data) {
		ractive.set("currentUser", data);
	}).fail(function (xhr, status, error) {
		ractive.set("currentUser", null);
	});

	// Fetch the groups for the logged in user
	var refreshGroups = function() {
		$.get('/groups', function(data) {
			ractive.set("groups", data);
		});
	};

	// Fetch the bills for the current group
	var refreshBills = function() {
		if (ractive.get("currentGroup")) {
			$.get('/bills/' + ractive.get("currentGroup._id"), function(data) {
				ractive.set("currentBills", data);
				// Re-foundation the document so newly rendered JS dropdowns will work ~10ms later (this is dirty af help pls)
				_.debounce(function() { $(document).foundation(); }, 10)();
			});
		} else {
			ractive.set("currentBills", []);
		}
	};

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

	// Set the current group
	ractive.on("selectGroup", function(event) {
		var g = this.get(event.keypath);
		this.set("currentGroup", g);
		populateMembers();
		refreshBills();
	});

	// Submit a new group
	ractive.on("newGroup", function(event) {
		$.post('/groups', {
			name: "TestGroup",
			members: [this.get("currentUser._id")],
			bills: []
		}, function(data) {
			refreshGroups();
		});
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

	// Mark a user paid/not paid on a bill
	ractive.on("togglePaid", function(event) {
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

});