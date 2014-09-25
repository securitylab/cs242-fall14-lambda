var Expr = require('./expr');
var Set = require('immutable').Set;


// This is basically an interactive tutorial you can run
Expr.prototype.demo = function() {
    // We can get a printable representation of a lambda term
    // (VERY USEFUL FOR DEBUGGING)
    console.log(this.pretty());

    // how do we decide what kind of lambda term this is?
    if(this.isLambda)   console.log('a lambda term');
    if(this.isApp)      console.log('an application term');
    if(this.isVar)      console.log('a variable term');

    // If we have a variable, then that variable has:
    //      name    -- name of the variable (a string)
    if(this.isVar) {
        console.log('The variable has name: ' + this.name);
    }

    // If we have an application, then that application has:
    //      fun     -- the left hand side of the application (an Expr)
    //      arg     -- the right hand side of the application (an Expr)
    if(this.isApp) {
        console.log('The left hand side is: ' + this.fun.pretty());
        console.log('The right hand side is: ' + this.arg.pretty());
    }

    // If we have a lambda, then that lambda has:
    //      name    -- variable name that the lambda defines/binds (a string)
    //      body    -- the body of the lambda expression (an Expr)
    if(this.isLambda) {
        console.log('The lambda binds variable name: ' + this.name);
        console.log('The lambda body is: ' + this.body.pretty());
    }

    // Ok, so that tells us how to get information out of expressions
    // WARNING:  OH NO, DON'T DO THIS
    //      this.name = 'y';
    // NO NO NO NO NO NO
    // Assume all the expressions are IMMUTABLE
    // If you want to change something about an expression, you need
    // to create a new expression instead.  This is the golden rule of
    // compiler/interpreter writing.  Your life will become awful
    // and terrible if you try to mutate the data structures that
    // represent your program.

    // How to create Expressions

    // To create a variable
    var freevar = Expr.Var('free');
    console.log('the free var expression is: ' + freevar.pretty());

    // To create a lambda term
    var identity = Expr.Lambda('free', freevar);
    console.log('the lambda term is: ' + identity.pretty());

    // To create an application term
    var redundant = Expr.App(identity, this);
    console.log('the application term is: ' + redundant.pretty());
}

Expr.prototype.numRedEx = function() {
    throw new Error('numRedEx() is unimplemented');
};

Expr.prototype.fv = function() {
    throw new Error("fv() not implemented yet");
};

Expr.prototype.subst = function(name, exp) {
    throw new Error("subst() not implemented yet");
};

Expr.prototype.normalizeCBV = function(strategy) {
    throw new Error("normalizeCBV() not implemented yet");
};

Expr.prototype.normalizeCBN = function(strategy) {
    throw new Error("normalizeCBN() not implemented yet");
};
