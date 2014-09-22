var Expr = require('./expr');
var Set = require('set');

Expr.prototype.fv = function() {
    throw new Error("fv not implemented yet");
};

Expr.prototype.subst = function(name, exp) {
    throw new Error("subst not implemented yet");
};

Expr.prototype.normalize = function() {
    throw new Error("normalize not implemented yet");
};
