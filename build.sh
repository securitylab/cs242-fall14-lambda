#!/bin/sh
nodejs node_modules/browserify/bin/cmd.js -r ./lib/expr.js:./expr -r ./lib/parser.js:./parser -o client/bundle.js
