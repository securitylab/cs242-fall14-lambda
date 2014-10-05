var adt = require('adt'), data = adt.data, only = adt.only;

var Expr = data(function () {
  return { Var   : {name: only(String)}
         , Lambda: {name: only(String), body: only(this)}
         , App   : {fun: only(this),  arg: only(this)} }
});

Expr.prototype.pretty = function() {
  if (this.isVar) {
    return this.name;
  } else if (this.isLambda) {
    var body = this.body.pretty();
    if (!this.body.isVar) {
      body = '(' + body + ')';
    }
    return '/' + this.name + '. ' + body;
  } else if (this.isApp) {
    var lhs = this.fun.pretty();
    var rhs = this.arg.pretty();
    if (!this.fun.isVar) {
      lhs = '(' + lhs + ')';
    }
    if (!this.arg.isVar) {
      rhs = '(' + rhs + ')';
    }
    return lhs + ' ' + rhs;
  }
};

Expr.prototype.deBruijnLevel = function() {
  var Map = require('immutable').Map;
  var f = function(e, id, d) {
    var result;
    if (e.isVar) {
      if (d.has(e.name)) {
        result = Expr.Var(d.get(e.name));
      } else {
        result = e;
      }
    } else if (e.isLambda) {
      var id2 = id + 1;
      var d2 = d.set(e.name, id2.toString());
      result = Expr.Lambda('', f(e.body, id2, d2));
    } else if (e.isApp) {
      result = Expr.App(f(e.fun, id, d), f(e.arg, id, d));
    }
    return result;
  }
  return f(this, 0, Map());
}

module.exports = Expr;

Expr.parse = require('./parser');
require('./eval');
