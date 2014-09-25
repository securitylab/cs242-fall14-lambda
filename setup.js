
var Expr = require('./lib/expr');
var Set = require('immutable').Set;

var t1 = Expr.parse('(/x. y) ((/x. x x) (/y. y))');
var t2 = Expr.parse('(/x. (/y. x y)) (/x. (x y) z)');
var t3 = Expr.parse('(/z. (/y. (/z. z) z)) (/x. y)');
var t4 = Expr.parse('(/x. f (x x)) (/x. f (x x))');


