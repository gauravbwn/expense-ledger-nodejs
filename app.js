const fs = require('fs');
const rfs = require('rotating-file-stream');
const http = require("http");
const path = require("path");
const uuid = require('uuid/v1');
// const chalk = require('chalk');
const logger = require("morgan");
const express = require("express");
const bodyParser = require("body-parser");

const session = require('express-session');
const passport = require('passport');
const WebAppStrategy = require('bluemix-appid').WebAppStrategy;

const port = process.env.PORT || 3001;

function padLeft(str, len) {
	return len > str.length
    	? (new Array(len - str.length + 1)).join(' ') + str
    	: str
};

function padRight(str, len) {
	return len > str.length
    	? str + (new Array(len - str.length + 1)).join(' ')
    	: str
};

function assignId (request, response, next) {
	if(!request.id){
  		request.id = uuid();
	}
	next();
};

var logDirectory = path.join(__dirname, 'logs');

// ensure log directory exists
fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory);

// create a rotating write stream for access logs
var accessLogStream = rfs('access.log', {
	size: '1K', // max log file size of 100M
	interval: '1d', // rotate daily
	path: logDirectory
});


logger.token('id', function getId (request) {
  return request.id
});

// create a write stream (in append mode)
var errorLogStream = fs.createWriteStream(path.join(logDirectory, 'error.log'), {flags: 'a'});

var app = express();
app.use(assignId);

var logFormat = (tokens, req, res) => {
	var status = tokens.status(req, res)
  	/*var statusColor = status >= 500
    	? 'red' : status >= 400
    	? 'yellow' : status >= 300
    	? 'cyan' : 'green'
*/
  	return padRight(tokens.id(req, res), 38)
  		+ ' ' + padRight((tokens['remote-addr'](req, res) || '*') + '-' + (tokens['remote-user'](req, res)|| '*'), 24)
  		+ ' ' + tokens.date(req, res, 'clf')
  		+ ' ' + padRight('"' + tokens.method(req, res) + ' ' + tokens.url(req, res) + '"', 48)
    	+ ' ' + status
    	+ ' ' + padLeft(tokens['response-time'](req, res) + ' ms', 8)
    	+ ' ' + '-'
    	+ ' ' + tokens.res(req, res, 'content-length') || '-'
};

// log all requests to access.log
app.use(logger(logFormat, {stream: accessLogStream}));

// log only 4xx and 5xx responses to console
app.use(logger(logFormat, {
  skip: function (request, response) { return response.statusCode < 400 },
  stream: errorLogStream
}));

app.use('/logs', express.static(path.join(__dirname, 'logs'), {extansions: ['log']}))

app.set("views", path.resolve(__dirname, "views"));
app.set("view engine", "ejs");

var entries = [];
app.locals.entries = entries;

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

app.use(function(req, res){
	res.status(404).render("404");
});

http.createServer(app).listen(port, function(){
	console.log(`Expense Ledger app listening on port ${port}`);
});
