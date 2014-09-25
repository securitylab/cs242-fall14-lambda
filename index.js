// here is a sample runner for loading up your lambda expressions
// from a file and running them all

var fs   = require('fs');
var Expr = require('./lib/expr');

function usage() {
  var s = "\
Usage: \n\
    node index.js normalization_strategy input_file \n\
\n\
normalization_strategy can be either of\n\
    * cbv, Call by Value\n\
    * cbn, Call by Name\n\
\n\
Example: \n\
    node index.js cbv example.lc \n\
    node index.js cbn example.lc \n";
  process.stderr.write(s);
  process.exit(1);
}

if (process.argv.length != 4) {
  usage();
}

if (process.argv[2] == 'cbv') {
  var strategy = 'cbv'
} else if (process.argv[2] = 'cbn') {
  var strategy = 'cbn'
} else {
  usage();
}

var lines = fs.readFileSync(process.argv[3], 'utf8').split(/\n/);
lines = lines.filter(function(n){ return n !== "" });
lines.forEach(function (line, no) {
  try {
    var e = Expr.parse(line);
  } catch(e) { 
    console.log((no+1) + ': ' + e)
    return;
  }
  if (strategy == 'cbv') {
    console.log((no+1) + ': ' + e.pretty() + ' => ' + e.normalizeCBV().pretty());
  } else if (strategy == 'cbn') {
    console.log((no+1) + ': ' + e.pretty() + ' => ' + e.normalizeCBN().pretty());
  }
});
