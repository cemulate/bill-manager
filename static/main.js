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
			userSearchResults: []
		}
	});

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
	ractive.set("dropdownDataForBill", function(bill) {
		var currentGroupMembers = this.get("currentGroupMembers");
		var data = [];
		_.each(currentGroupMembers, function(gm) {
			if (_.indexOf(bill.payers, gm._id) == -1) {
				data.push({
					billId: bill._id,
					userId: gm._id,
					name: gm.name
				});
			}
		});
		return data;
	});

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
			paid: false
		}];
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

	var userSearch = function(name) {
		$.get('/users/' + name, function(data) {
			ractive.set("userSearchResults", data);
		});
	}

	// https://github.com/dennyferra/TypeWatch
	$("#addMemberModalInput").typeWatch({
		callback: function () {
			userSearch($("#addMemberModalInput").val());
		},
		wait: 200,
		highlight: true,
		captureLength: 0
	});

	$.get('/login').done(function (data) {
		ractive.set("currentUser", data);
	}).fail(function (xhr, status, error) {
		ractive.set("currentUser", null);
	});

	var refreshGroups = function() {
		$.get('/groups', function(data) {
			console.log(data);
			ractive.set("groups", data);
		});
	};

	var refreshBills = function() {
		if (ractive.get("currentGroup")) {
			$.get('/bills/' + ractive.get("currentGroup._id"), function(data) {
				ractive.set("currentBills", data);
				// Re-foundation the document so newly rendered JS dropdowns will work ~10ms later (this is dirty af help pls)
				_.debounce(function() { console.log("Hey"); $(document).foundation(); }, 10)();
			});
		} else {
			ractive.set("currentBills", []);
		}
	};

	var populateMembers = function() {
		$.get('/members/' + ractive.get("currentGroup._id"), function(data) {
			ractive.set("currentGroupMembers", data);
		});
	};

	ractive.observe("currentUser", function(newVal, oldVal, keypath) {
		if (this.get("currentUser")) {
			refreshGroups();
		}
	});

	ractive.on("selectGroup", function(event) {
		var g = this.get(event.keypath);
		this.set("currentGroup", g);
		populateMembers();
		refreshBills();
	});

	ractive.on("newGroup", function(event) {
		$.post('/groups', {
			name: "TestGroup",
			members: [this.get("currentUser._id")],
			bills: []
		}, function(data) {
			refreshGroups();
		});
	});

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

	ractive.on("newBill", function(event) {
		$.post('/bills', {
			name: "Test",
			amount: 100,
			owner: this.get("currentGroup._id"),
			payers: [{
				userId: this.get("currentUser._id"),
				paid: false
			}, {
				userId: this.get("currentUser._id"),
				paid: true
			}]
		}, function(data) {
			refreshBills();
		});
	});

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

	ractive.on("addGroupMemberToBill", function(event) {

		// Event context: {userId, billId, name} because of dropdownContentForBill hack (eeeeuuuughh)

		var bill = _.find(this.get("currentBills"), function(bill) { return bill._id == event.context.billId; });
		var bIndex = _.indexOf(this.get("currentBills"), bill);
		var payers = bill.payers;
		var payerIds = _.map(payers, function(x) {return x.userId});
		if (!_.contains(payerIds, event.context.userId)) {
			payers.push({
				userId: event.context.userId,
				paid: false
			});
			var setKeypath = "currentBills." + bIndex + ".payers";
			this.set(setKeypath, payers);
			console.log(bill);

			$.ajax('/bills', {
				method: "PUT",
				data: {
					id: bill._id,
					replacement: bill
				}
			});
		}
	});

	ractive.on("addAllMembersToBill", function(event) {
		var bill = event.context;
		bill.payers = _.map(this.get("currentGroupMembers"), function(x) {return {userId: x._id, paid: false}});
		console.log(bill);
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

	ractive.on("togglePaid", function(event) {
		var current = (event.context.paid == "true");
		console.log(event);
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