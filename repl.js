#!/usr/bin/env nodejs

var repl = require("repl");
var cli = repl.start(">>> ");

cli.commands[".load"].action.call(cli, "setup.js")
