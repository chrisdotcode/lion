"use strict";

var router = require("./index.js").router();

var assert = require("assert");
var util   = require("util");

function prettyPrint() {
	Array.prototype.slice.call(arguments).forEach(function(x) {
		console.log(util.inspect(x, { color: true, depth: null, }));
	});
}

prettyPrint(router);

router
	.get("/user/settings", settingsHandler)
	.get("/user/:name", userNameHandler)
	.get(/\/user\/([A-Za-z]+)\/(\d+)/, userNameAgeHandler);

prettyPrint(router);

var request1 = {
	method: "GET",
	url: "/user/settings?min=20&max=40&no_track",
};

var request2 = {
	method: "GET",
	url: "/user/chrisdotcode?min=20&max=40&no_track",
};

var request3 = {
	method: "GET",
	url: "/user/chrisdotcode/23?min=20&max=40&no_track",
};

var response = {
	headers: {
		"Content-Type": "text/plain",
	},
};

var params1 = { min: '20', max: '40', no_track: '' };

router.dispatch(request1, response);
router.dispatch(request2, response);
router.dispatch(request3, response);

function settingsHandler(request, response, params) {
	assert.deepEqual(request, request1);
	assert.deepEqual(response, response);
	assert.deepEqual(params, params1);
	console.log("Here are your settings, sir.");
}

function userNameHandler(request, response, userName, params) {
	assert.deepEqual(request, request2);
	assert.deepEqual(response, response);
	assert.equal(userName, "chrisdotcode");
	assert.deepEqual(params, params1);
	console.log("Hello, " + userName + ".");
}

function userNameAgeHandler(request, response, userName, age, params) {
	assert.deepEqual(request, request3);
	assert.deepEqual(response, response);
	assert.equal(userName, "chrisdotcode");
	assert.equal(age, 23);
	assert.deepEqual(params, params1);
	console.log("Hello, " + userName + ". You are " + age + " years old.");
}
