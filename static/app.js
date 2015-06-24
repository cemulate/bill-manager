function Person(name) {
	this.name = name;
}

function Bill(amount, payer) {
	this.amount = amount;
	this.payer = payer;
}



var appTemplate = null;

$.when(

	// Grab the main Ractive template

	$.get("static/appTemplate.html", function(t) {
		appTemplate = t;
	})

).then(function () {

	var ractive = new Ractive({
		magic: false,
		el: 'appContainer',
		template: appTemplate,
		data: {
			people: [],
			bills: []
		}
	});

	var people = [];
	people.push(new Person("Chase"));

	var chase = people[0];

	var bills = [];
	bills.push(new Bill(100, chase));

	ractive.set("people", people);
	ractive.set("bills", bills);

	ractive.on("testLogin", function(event) {
		// $.post("/signup", {
		// 	email: "c.ed.mead@gmail.com",
		// 	password: "hunter2"
		// });
		$.post("/login", {
			email: "c.ed.mead@gmail.com", 
			password: "hunter2"
		});

		var users;
		$.get("/users", function(data) {
			users = data.users;
			console.log(users)
		});
	});

});