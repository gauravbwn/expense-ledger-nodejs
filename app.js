const http = require("http");
const path = require("path");
const express = require("express");
const logger = require("morgan");
const bodyParser = require("body-parser");

const port = process.env.PORT || 3001;

var app = express();

app.set("views", path.resolve(__dirname, "views"));
app.set("view engine", "ejs");

var entries = [];
app.locals.entries = entries;

app.use(logger("dev"));

app.use(bodyParser.urlencoded({extended: false}));

app.get("/", function(request, response) {
	response.render("index");
});

app.get("/new-entry", function(request, response) {
	response.render("new-entry");
});

app.post("/new-entry", function(request, response) {
	if(!request.body.item || !request.body.amount || !request.body.mode) {
		response.status(400).send("Entries must have item, amount and mode.");
		return;
	}
	entries.push({
		item: request.body.item,
		amount: request.body.amount,
		mode: request.body.mode,
		loggedAt: new Date()
	});
	response.redirect("/");
});

app.use(function(request, response){
	response.status(404).render("404");
});

http.createServer(app).listen(port, function(){
	console.log(`Expense Ledger app listening on port ${port}');
});