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
    return '\\' + this.name + ' -> ' + body;
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

module.exports = Expr;

Expr.parse = require('./parser');
require('./eval');
