var Expr = require('./expr');
var Set = require('set');

Expr.prototype.demo = function() {
    // how do we decide what kind of lambad term this is?
    if(this.isLambda)   console.log('a lambda term');
    if(this.isApp)      console.log('an application term');
    if(this.isVar)      console.log('a variable term');
}

Expr.prototype.fv = function() {
    throw new Error("fv not implemented yet");
};

Expr.prototype.subst = function(name, exp) {
    throw new Error("subst not implemented yet");
};

Expr.prototype.normalize = function(strategy) {
    if (strategy == Expr.Strategy.CALL_BY_VALUE) {
        throw new Error("normalize CBV not implemented yet");
    } else if (strategy == Expr.Strategy.CALL_BY_NAME) {
        throw new Error("normalize CBN not implemented yet");
    }
};
