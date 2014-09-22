require('util-is');
var util = require('util');
var Expr = require('./expr');
var Parsimmon = require('parsimmon');

var regex = Parsimmon.regex;
var string = Parsimmon.string;
var optWhitespace = Parsimmon.optWhitespace;
var whitespace = Parsimmon.whitespace;
var lazy = Parsimmon.lazy;
var seq = Parsimmon.seq;

function lexeme(p) { return p.skip(optWhitespace); }

var lparen = lexeme(string('('));
var rparen = lexeme(string(')'));
var arrow  = lexeme(string('->'));
var bslash = lexeme(string('\\'));
var id = lexeme(regex(/[a-z_]\w*/i));

// expr ::= app | non~app
var expr = lazy('expression', function() {
  return app.or(nonApp);
});
// pexpr ::= ( expr )
var pexpr = lparen.then(expr).skip(rparen);

// lambda ::= \ id -> expr
var lambda = seq(bslash, id, arrow, expr).map(function(res) {
  return Expr.Lambda(res[1], handleVar(res[3]));
});

// nonApp ::= lambda | id | pexpr
var nonApp = lambda.or(id).or(pexpr);
// app ::= nonApp nonApp
var app    = seq(nonApp, nonApp).map(function(res) {
  return Expr.App(handleVar(res[0]), handleVar(res[1]));
});

module.exports = function (str) {
  var result = expr.parse(str);
  if (result.status === true) {
    return handleVar(result.value);
  } else {
    throw new Error('Failed to parse expression [' + result.index
                    + '] expected: ' + result.expected);
  }
};

// All non function bindings should be converted to variables
function handleVar(e) {
  if (util.isString(e)) {
    return Expr.Var(e);
  }
  return e;
}
