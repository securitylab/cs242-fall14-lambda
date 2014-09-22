var fs   = require('fs');
var Expr = require('./lib/expr');


var lines = fs.readFileSync(process.argv[2], 'utf8').split(/\n/);
lines.forEach(function (line, no) {
  try {
    var e = Expr.parse(line);
  } catch(e) { 
    console.log((no+1) + ': ' + e)
    return;
  }
  console.log((no+1) + ': ' + e.pretty() + ' => ' + e.normalize().pretty());
});
