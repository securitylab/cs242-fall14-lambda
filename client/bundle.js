require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"./expr":[function(require,module,exports){
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

},{"./eval":1,"./parser":undefined,"adt":2}],"./parser":[function(require,module,exports){
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

},{"./expr":undefined,"parsimmon":8,"util":6,"util-is":13}],1:[function(require,module,exports){
var Expr = require('./expr');

var Set = require('set');

Expr.prototype.fv = function() {
  if (this.isVar) {
    return new Set([this.name]);
  } else if (this.isLambda) {
    var s = this.body.fv();
    s.remove(this.name);
    return s;
  } else if (this.isApp) {
    return this.fun.fv().union(this.arg.fv());
  }
};

Expr.prototype.subst = function(name, exp) {
  if (this.isVar) {
    if (this.name === name) {
      return exp;
    }
    return this;
  } else if (this.isApp) {
    return Expr.App(this.fun.subst(name, exp), this.arg.subst(name, exp));
  } else if (this.isLambda) {
    var fv = this.fv();

    // generate fresh name, if name is free in body
    var cnt = 0;
    var original = name;
    while (fv.contains(name)) {
      name = original + cnt++;
    }

    return Expr.Lambda(name, this.body.subst(name, exp));
  }

};

Expr.prototype.normalize = function(cloned) {
  var self = cloned ? this : this.clone();
  if (self.isApp) {
    var arg = self.arg.normalize(true);
    var fun = self.fun.normalize(true);
    if (fun.isLambda) {
      self = fun.body.subst(fun.name, arg).normalize(true);
    }
  }
  return self;
};

},{"./expr":undefined,"set":undefined}],2:[function(require,module,exports){
// adt.js 
// ------
// Algebraic data types and immutable structures in Javascript
//
// version : 0.7.2
// author  : Nathan Faubion <nathan@n-son.com>
// license : MIT

;(function (adt) {
  'use strict';

  // Base class from which all adt.js classes inherit.
  adt.__Base__ = function () {};

  // ADT Class Generation
  // --------------------

  adt.data = function () {
    var targ0 = typeof arguments[0];

    // adt.data(...names: String)
    if (targ0 === 'string') {
      var names = arguments;
      return adt.data(function (type) {
        var i = 0, len = names.length;
        for (; i < len; i++) type(names[i]);
      });
    }

    // adt.data(types: Object)
    if (targ0 === 'object') {
      var types = arguments[0];
      return adt.data(function (type) {
        for (var name in types) {
          if (types.hasOwnProperty(name)) type(name, types[name]);
        }
      });
    }

    // adt.data(configure: Function)
    var callback = arguments[0] || noop;
    var names = [];

    // Create a new parent class.
    // This class should never be created using `new`. You obviously can,
    // but it won't be of much use. You can however override the apply method
    // to create default instances.
    var D = inherit(adt.__Base__, function () {
      if (!(this instanceof D) && D.apply !== Function.prototype.apply) {
        return D.apply(this, arguments);
      }
      throw new Error('Bad invocation');
    });

    // Adds a new type to the ADT.
    D.type = function (name, tmpl) {
      if (typeof name !== 'string') {
        tmpl = name;
        name = uniqueId('Anonymous');
      }
      
      // Create a new template if not provided with one
      var isSingle = checkTypes([String, Boolean, Number, Date, null, void 0], tmpl);
      if (isSingle) tmpl = adt.single(tmpl);
      else if (typeof tmpl !== 'function') {
        tmpl = checkType(Array, tmpl)
          ? adt.record.apply(null, tmpl)
          : adt.record(tmpl);
      }

      // Add typechecking attributes for this type. Everything starts out as
      // false by default. Each individual class should overrides its own.
      D.prototype['is' + name] = false;

      // Call the template to build our type.
      var d = tmpl(D, name);

      // Bind the constructor context to avoid conflicts with calling as a method.
      d = (typeof d === 'function') ? extend(d.bind(), d) : d;

      // Export it on the parent type.
      D[name] = d;
      names.push(name);

      return d;
    };

    // Call the callback with the constructor as the context.
    var types = callback.call(D, D.type, D);

    // If an object was returned in the callback, assume it's a mapping of
    // more types to add.
    if (typeof types === 'object' && !(types instanceof adt.__Base__)) {
      for (var name in types) {
        if (types.hasOwnProperty(name)) D.type(name, types[name]);
      }
    }

    // Keep the type function around because it allows for nice type
    // declarations, but give the option to seal it. This will call `seal`
    // on any sub types to.
    D.seal = function () { 
      var i = 0, n, name;
      for (; n = names[i]; i++) if (this[n].seal) this[n].seal();
      delete D.type;
      delete D.seal;
      return D;
    };

    // Export names as a meta object
    D.__names__ = names;
    D.prototype.__adtClass__ = D;
    return D;
  };

  // Singleton Class Generation
  // --------------------------

  // Create a single empty class instance. You can pass in a value that the
  // class will use during JSON serialization.
  adt.single = function (val) {
    var ctr = function () {};
    ctr.__value__ = val === void 0 ? null : val;

    return function (parent, name) {
      inherit(parent, ctr);
      extend(ctr.prototype, adt.single.__methods__);

      ctr.className = name;
      ctr.prototype['is' + name] = true;

      return new ctr();
    };
  }

  // Singleton Methods
  // -----------------

  adt.single.__methods__ = {
    toString: function () {
      return this.constructor.className;
    },

    toJSON: function () {
      return this.constructor.__value__;
    },

    clone: function () {
      return this;
    },

    equals: function (that) {
      return this === that;
    },

    hasInstance: function(that) {
      return this === that;
    }
  };

  // Record Class Generation
  // -----------------------

  adt.record = function () {
    var targ0 = typeof arguments[0];

    // adt.record(...names: String)
    if (targ0 === 'string') {
      var names = arguments;
      return adt.record(function (field) {
        var i = 0, len = names.length;
        for (; i < len; i++) field(names[i], adt.any);
      });
    }

    // adt.record(fields: Object)
    else if (targ0 === 'object') {
      var fields = arguments[0];
      return adt.record(function (field) {
        for (var name in fields) {
          if (fields.hasOwnProperty(name)) field(name, fields[name]);
        }
      });
    }

    // adt.record(template: Function)
    var callback = arguments[0] || noop;
    var names = [];
    var constraints = {};

    // A record's constructor can be called without `new` and will also throw
    // an error if called with the wrong number of arguments. Its arguments can
    // be curried as long as it isn't called with the `new` keyword.
    var ctr = function () {
      var args = arguments;
      var len = names.length;
      if (this instanceof ctr) {
        if (args.length !== len) {
          throw new Error(
            'Unexpected number of arguments for ' + ctr.className + ': ' +
            'got ' + args.length + ', but need ' + len + '.'
          );
        }
        var i = 0, n;
        for (; n = names[i]; i++) {
          this[n] = constraints[n](args[i], n, ctr);
        }
      } else {
        return args.length < len
          ? partial(ctr, toArray(args))
          : ctrApply(ctr, args);
      }
    };

    return function (parent, name) {
      inherit(parent, ctr);
      extend(ctr, adt.record.__classMethods__);
      extend(ctr.prototype, adt.record.__methods__);

      ctr.className = name;
      ctr.prototype['is' + name] = true;

      // Declares a field as part of the type.
      ctr.field = function (name, constraint) {
        if (!constraint) constraint = adt.any;
        if (typeof constraint !== 'function') {
          throw new TypeError('Constraints must be functions')
        }
        names.push(name);
        constraints[name] = constraint;
        return ctr;
      };

      // Call the callback with the contructor as the context.
      var fields = callback.call(ctr, ctr.field, ctr);

      // If an object was returned in the callback, assume it's a mapping of
      // more fields to add.
      if (typeof fields === 'object' && fields !== ctr) {
        for (var name in fields) {
          if (fields.hasOwnProperty(name)) ctr.field(name, fields[name]);
        }
      }

      // Export names and constraints as meta attributes.
      ctr.__names__ = names;
      ctr.__constraints__ = constraints;
      return ctr;
    };
  };

  // Record Methods
  // --------------
  
  adt.record.__methods__ = {
    toString: function () {
      var ctr = this.constructor;
      var vals = ctr.unapply(this);
      return ctr.className + (vals.length ? '(' + vals.join(', ') + ')' : '');
    },

    toJSON: function () {
      return this.constructor.unapplyObject(this, toJSONValue);
    },

    // Clones any value that is an adt.js type, delegating other JS values
    // to `adt.nativeClone`.
    clone: function () {
      var ctr = this.constructor;
      var names = ctr.__names__;
      var args = [], i = 0, n, val;
      for (; n = names[i]; i++) {
        val = this[n];
        args[i] = val instanceof adt.__Base__ 
          ? val.clone()
          : adt.nativeClone(val);
      }
      return ctr.apply(null, args);
    },

    // Recursively compares all adt.js types, delegating other JS values
    // to `adt.nativeEquals`.
    equals: function (that) {
      var ctr = this.constructor;
      if (this === that) return true;
      if (!(that instanceof ctr)) return false;
      var names = ctr.__names__;
      var i = 0, len = names.length;
      var vala, valb, n;
      for (; i < len; i++) {
        n = names[i], vala = this[n], valb = that[n];
        if (vala instanceof adt.__Base__) {
          if (!vala.equals(valb)) return false;
        } else if (!adt.nativeEquals(vala, valb)) return false;
      }
      return true;
    },

    // Overloaded to take either strings or numbers. Throws an error if the
    // key can't be found.
    get: function (field) {
      var ctr = this.constructor;
      var names = ctr.__names__;
      var constraints = ctr.__constraints__;
      if (typeof field === 'number') {
        if (field < 0 || field > names.length - 1) {
          throw new Error('Field index out of range: ' + field);
        }
        field = names[field];
      } else {
        if (!constraints.hasOwnProperty(field)) {
          throw new Error('Field name does not exist: ' + field);
        }
      }
      return this[field];
    },

    set: function (vals) {
      var ctr = this.constructor;
      var names = ctr.__names__;
      var args = [], i = 0, n;
      for (; n = names[i]; i++) args[i] = n in vals ? vals[n] : this[n];
      return ctr.apply(null, args);
    }
  };

  adt.record.__classMethods__ = {
    create: function (vals) {
      var args = [];
      var names = this.__names__;
      var i = 0, len = names.length, n;
      for (; n = names[i]; i++) {
        if (!(n in vals)) {
          throw new Error('Missing `' + n + '` in arguments to ' + this.className);
        }
        args[i] = vals[n];
      }
      return this.apply(null, args);
    },

    hasInstance: function (inst) {
      return inst instanceof this;
    },

    unapply: function (inst, fn) {
      if (this.hasInstance(inst)) {
        var names = this.__names__;
        var vals = [], i = 0, n;
        for (; n = names[i]; i++) vals[i] = fn ? fn(inst[n], n) : inst[n];
        return vals;
      }
    },

    unapplyObject: function (inst, fn) {
      if (this.hasInstance(inst)) {
        var names = this.__names__;
        var vals = {}, i = 0, n;
        for (; n = names[i]; i++) vals[n] = fn ? fn(inst[n], n) : inst[n];
        return vals;
      }
    },

    seal: function () {
      delete this.field;
      delete this.seal;
      return this;
    }
  };

  // Enum Class Generation
  // ---------------------

  adt.enumeration = function () {
    var E = adt.data.apply(null, arguments);
    var order = 0;

    // Helper to add the order meta attribute to a type.
    function addOrder (that) {
      if (that.constructor) that = that.constructor;
      that.__order__ = order++;
      return that;
    }

    // Iterate through the created types, applying the order meta attribute.
    for (var i = 0, n; n = E.__names__[i]; i++) addOrder(E[n]);

    // Patch the type function to add an order to any types created later.
    var __type = E.type;
    E.type = function () {
      return addOrder(__type.apply(E, arguments));
    };

    extend(E.prototype, adt.enumeration.__methods__);
    return E;
  };

  adt['enum'] = adt.enumeration;

  // Enum Methods
  // ------------

  function assertADT (a, b) {
    if (b instanceof a.__adtClass__) return true;
    throw new TypeError('Unexpected type');
  }

  function orderOf (that) {
    return that.constructor.__order__;
  }

  adt.enumeration.__methods__ = {
    lt: function (that) {
      return assertADT(this, that) && orderOf(this) < orderOf(that);
    },

    lte: function (that) {
      return assertADT(this, that) && orderOf(this) <= orderOf(that);
    },

    gt: function (that) {
      return assertADT(this, that) && orderOf(this) > orderOf(that);
    },

    gte: function (that) {
      return assertADT(this, that) && orderOf(this) >= orderOf(that);
    },

    eq: function (that) {
      return assertADT(this, that) && orderOf(this) === orderOf(that);
    },

    neq: function (that) {
      return assertADT(this, that) && orderOf(this) !== orderOf(that);
    },
  };

  // Public Helpers
  // --------------

  // Cloning for native JS types just returns a reference.
  adt.nativeClone = function (x) { return x; };

  // Equality for native JS types is just strict comparison.
  adt.nativeEquals = function (a, b) { return a === b; };

  // Shortcut for creating an ADT with only one type.
  adt.newtype = function () {
    var args = toArray(arguments);
    var data = adt.data();
    return data.type.apply(data, args);
  };

  // A contraint function that will accept any value.
  adt.any = function (x) { return x; };

  // A constraint generator that will perform instanceof checks on the value
  // to make sure it is of the correct type.
  adt.only = function () {
    var args = arguments;
    return function (x, field, ctr) {
      if (checkTypes(args, x)) return x;
      var err = 'Unexpected type';
      if (field && ctr) err += ' for `' + field + '` of ' + ctr.className;
      throw new TypeError(err);
    };
  };

  // Utility Functions
  // -----------------

  function toArray (a, start) {
    var dest = [], i = start || 0, len = a.length;
    for (; i < len; i++) dest.push(a[i]);
    return dest;
  }

  function ctrApply (ctr, args) {
    var C = function () {};
    C.prototype = ctr.prototype;
    var inst = new C();
    var ret = ctr.apply(inst, args);
    return inst;
  }

  function inherit (sup, sub) {
    var C = function () {};
    C.prototype = sup.prototype;
    sub.prototype = new C();
    sub.prototype.constructor = sub;
    return sub;
  }

  function partial (func, args) {
    return function () {
      return func.apply(this, args.concat(toArray(arguments)));
    };
  }

  function extend (dest /*, ...sources*/) {
    var args = toArray(arguments, 1);
    var i = 0, len = args.length, k;
    for (; i < len; i++) {
      for (k in args[i]) {
        if (args[i].hasOwnProperty(k)) dest[k] = args[i][k];
      }
    }
    return dest;
  };

  function checkType (type, x) {
    if (type instanceof Function) {
      if (x instanceof type
      || type === Number  && typeof x === 'number'
      || type === String  && typeof x === 'string'
      || type === Boolean && typeof x === 'boolean') return true;
    } else {
      if (type instanceof adt.__Base__ && type.equals(x)
      || type === x) return true;
    }
    return false;
  }

  function checkTypes(types, x) {
    var i = 0, len = types.length;
    for (; i < len; i++) if (checkType(types[i], x)) return true;
    return false;
  }

  function toJSONValue (x) {
    return x && typeof x === 'object' && x.toJSON ? x.toJSON() : x;
  }

  var id = 0;
  function uniqueId (pre) {
    return (pre || '') + id++;
  }

  function noop () {}

})(typeof exports !== 'undefined' ? exports : (this.adt = {}));

},{}],3:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],4:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],5:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],6:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":5,"_process":4,"inherits":3}],7:[function(require,module,exports){
var P = require('pjs').P;
var Parsimmon = {};

Parsimmon.Parser = P(function(_, _super, Parser) {
  "use strict";
  // The Parser object is a wrapper for a parser function.
  // Externally, you use one to parse a string by calling
  //   var result = SomeParser.parse('Me Me Me! Parse Me!');
  // You should never call the constructor, rather you should
  // construct your Parser from the base parsers and the
  // parser combinator methods.

  function makeSuccess(index, value) {
    return {
      status: true,
      index: index,
      value: value,
      furthest: -1,
      expected: ''
    };
  }

  function makeFailure(index, expected) {
    return {
      status: false,
      index: -1,
      value: null,
      furthest: index,
      expected: expected
    };
  }

  function furthestBacktrackFor(result, last) {
    if (!last) return result;
    if (result.furthest >= last.furthest) return result;

    return {
      status: result.status,
      index: result.index,
      value: result.value,
      furthest: last.furthest,
      expected: last.expected
    }
  }

  function assertParser(p) {
    if (!(p instanceof Parser)) throw new Error('not a parser: '+p);
  }

  var formatError = Parsimmon.formatError = function(stream, error) {
    var expected = error.expected;
    var i = error.index;

    if (i === stream.length) {
      return 'expected ' + expected + ', got the end of the string';
    }

    var prefix = (i > 0 ? "'..." : "'");
    var suffix = (stream.length - i > 12 ? "...'" : "'");
    return (
      'expected ' + expected + ' at character ' + i + ', got ' +
      prefix + stream.slice(i, i+12) + suffix
    );
  };

  _.init = function(body) { this._ = body; };

  _.parse = function(stream) {
    var result = this.skip(eof)._(stream, 0);

    return result.status ? {
      status: true,
      value: result.value
    } : {
      status: false,
      index: result.furthest,
      expected: result.expected
    };
  };

  // [Parser a] -> Parser [a]
  var seq = Parsimmon.seq = function() {
    var parsers = [].slice.call(arguments);
    var numParsers = parsers.length;

    return Parser(function(stream, i) {
      var result;
      var accum = new Array(numParsers);

      for (var j = 0; j < numParsers; j += 1) {
        result = furthestBacktrackFor(parsers[j]._(stream, i), result);
        if (!result.status) return result;
        accum[j] = result.value
        i = result.index;
      }

      return furthestBacktrackFor(makeSuccess(i, accum), result);
    });
  };

  /**
   * Allows to add custom primitive parsers
   */
  var custom = Parsimmon.custom = function(parsingFunction) {
    return Parser(parsingFunction(makeSuccess, makeFailure));
  };

  var alt = Parsimmon.alt = function() {
    var parsers = [].slice.call(arguments);
    var numParsers = parsers.length;
    if (numParsers === 0) return fail('zero alternates')

    return Parser(function(stream, i) {
      var result;
      for (var j = 0; j < parsers.length; j += 1) {
        result = furthestBacktrackFor(parsers[j]._(stream, i), result);
        if (result.status) return result;
      }
      return result;
    });
  };

  // -*- primitive combinators -*- //
  _.or = function(alternative) {
    return alt(this, alternative);
  };

  _.then = function(next) {
    if (typeof next === 'function') {
      throw new Error('chaining features of .then are no longer supported');
    }

    assertParser(next);
    return seq(this, next).map(function(results) { return results[1]; });
  };

  // -*- optimized iterative combinators -*- //
  // equivalent to:
  // _.many = function() {
  //   return this.times(0, Infinity);
  // };
  // or, more explicitly:
  // _.many = function() {
  //   var self = this;
  //   return self.then(function(x) {
  //     return self.many().then(function(xs) {
  //       return [x].concat(xs);
  //     });
  //   }).or(succeed([]));
  // };
  _.many = function() {
    var self = this;

    return Parser(function(stream, i) {
      var accum = [];
      var result;
      var prevResult;

      for (;;) {
        result = furthestBacktrackFor(self._(stream, i), result);

        if (result.status) {
          i = result.index;
          accum.push(result.value);
        }
        else {
          return furthestBacktrackFor(makeSuccess(i, accum), result);
        }
      }
    });
  };

  // equivalent to:
  // _.times = function(min, max) {
  //   if (arguments.length < 2) max = min;
  //   var self = this;
  //   if (min > 0) {
  //     return self.then(function(x) {
  //       return self.times(min - 1, max - 1).then(function(xs) {
  //         return [x].concat(xs);
  //       });
  //     });
  //   }
  //   else if (max > 0) {
  //     return self.then(function(x) {
  //       return self.times(0, max - 1).then(function(xs) {
  //         return [x].concat(xs);
  //       });
  //     }).or(succeed([]));
  //   }
  //   else return succeed([]);
  // };
  _.times = function(min, max) {
    if (arguments.length < 2) max = min;
    var self = this;

    return Parser(function(stream, i) {
      var accum = [];
      var start = i;
      var result;
      var prevResult;

      for (var times = 0; times < min; times += 1) {
        result = self._(stream, i);
        prevResult = furthestBacktrackFor(result, prevResult);
        if (result.status) {
          i = result.index;
          accum.push(result.value);
        }
        else {
          return prevResult;
        }
      }

      for (; times < max; times += 1) {
        result = self._(stream, i);
        prevResult = furthestBacktrackFor(result, prevResult);
        if (result.status) {
          i = result.index;
          accum.push(result.value);
        }
        else {
          break;
        }
      }

      return furthestBacktrackFor(makeSuccess(i, accum), prevResult);
    });
  };

  // -*- higher-level combinators -*- //
  _.result = function(res) { return this.then(succeed(res)); };
  _.atMost = function(n) { return this.times(0, n); };
  _.atLeast = function(n) {
    var self = this;
    return seq(this.times(n), this.many()).map(function(results) {
      return results[0].concat(results[1]);
    });
  };

  _.map = function(fn) {
    var self = this;
    return Parser(function(stream, i) {
      var result = self._(stream, i);
      if (!result.status) return result;
      return furthestBacktrackFor(makeSuccess(result.index, fn(result.value)), result);
    });
  };

  _.skip = function(next) {
    return seq(this, next).map(function(results) { return results[0]; });
  };

  _.mark = function() {
    return seq(index, this, index).map(function(results) {
      return { start: results[0], value: results[1], end: results[2] };
    });
  };

  _.desc = function(expected) {
    return this.or(fail(expected))
  };

  // -*- primitive parsers -*- //
  var string = Parsimmon.string = function(str) {
    var len = str.length;
    var expected = "'"+str+"'";

    return Parser(function(stream, i) {
      var head = stream.slice(i, i+len);

      if (head === str) {
        return makeSuccess(i+len, head);
      }
      else {
        return makeFailure(i, expected);
      }
    });
  };

  var regex = Parsimmon.regex = function(re) {
    var anchored = RegExp('^(?:'+re.source+')', (''+re).slice((''+re).lastIndexOf('/')+1));

    return Parser(function(stream, i) {
      var match = anchored.exec(stream.slice(i));

      if (match) {
        var result = match[0];
        return makeSuccess(i+result.length, result);
      }
      else {
        return makeFailure(i, re);
      }
    });
  };

  var succeed = Parsimmon.succeed = function(value) {
    return Parser(function(stream, i) {
      return makeSuccess(i, value);
    });
  };

  var fail = Parsimmon.fail = function(expected) {
    return Parser(function(stream, i) { return makeFailure(i, expected); });
  };

  var letter = Parsimmon.letter = regex(/[a-z]/i).desc('a letter')
  var letters = Parsimmon.letters = regex(/[a-z]*/i)
  var digit = Parsimmon.digit = regex(/[0-9]/).desc('a digit');
  var digits = Parsimmon.digits = regex(/[0-9]*/)
  var whitespace = Parsimmon.whitespace = regex(/\s+/).desc('whitespace');
  var optWhitespace = Parsimmon.optWhitespace = regex(/\s*/);

  var any = Parsimmon.any = Parser(function(stream, i) {
    if (i >= stream.length) return makeFailure(i, 'any character');

    return makeSuccess(i+1, stream.charAt(i));
  });

  var all = Parsimmon.all = Parser(function(stream, i) {
    return makeSuccess(stream.length, stream.slice(i));
  });

  var eof = Parsimmon.eof = Parser(function(stream, i) {
    if (i < stream.length) return makeFailure(i, 'EOF');

    return makeSuccess(i, null);
  });

  var test = Parsimmon.test = function(predicate) {
    return Parser(function(stream, i) {
      var char = stream.charAt(i);
      if (i < stream.length && predicate(char)) {
        return makeSuccess(i+1, char);
      }
      else {
        return makeFailure(i, 'a character matching '+predicate);
      }
    });
  };

  var takeWhile = Parsimmon.takeWhile = function(predicate) {
    return Parser(function(stream, i) {
      var j = i;
      while (j < stream.length && predicate(stream.charAt(j))) j += 1;
      return makeSuccess(j, stream.slice(i, j));
    });
  };

  var lazy = Parsimmon.lazy = function(desc, f) {
    if (arguments.length < 2) {
      f = desc;
      desc = undefined;
    }

    var parser = Parser(function(stream, i) {
      parser._ = f()._;
      return parser._(stream, i);
    });

    if (desc) parser = parser.desc(desc)

    return parser;
  };

  var index = Parsimmon.index = Parser(function(stream, i) {
    return makeSuccess(i, i);
  });

  //- fantasyland compat

  //- Monoid (Alternative, really)
  _.concat = _.or;
  _.empty = fail('empty')

  //- Applicative
  _.of = Parser.of = Parsimmon.of = succeed

  _.ap = function(other) {
    return seq(this, other).map(function(results) {
      return results[0](results[1]);
    });
  };

  //- Monad
  _.chain = function(f) {
    var self = this;
    return Parser(function(stream, i) {
      var result = self._(stream, i);
      if (!result.status) return result;
      var nextParser = f(result.value);
      return furthestBacktrackFor(nextParser._(stream, result.index), result);
    });
  };
});
module.exports = Parsimmon;

},{"pjs":10}],8:[function(require,module,exports){
module.exports = require('./build/parsimmon.commonjs');
exports.version = require('./package.json').version;

},{"./build/parsimmon.commonjs":7,"./package.json":12}],9:[function(require,module,exports){
// pass
var P = (function(prototype, ownProperty, undefined) {
  return function P(_superclass /* = Object */, definition) {
    // handle the case where no superclass is given
    if (definition === undefined) {
      definition = _superclass;
      _superclass = Object;
    }

    // C is the class to be returned.
    //
    // When called, creates and initializes an instance of C, unless
    // `this` is already an instance of C, then just initializes `this`;
    // either way, returns the instance of C that was initialized.
    //
    //  TODO: the Chrome inspector shows all created objects as `C`
    //        rather than `Object`.  Setting the .name property seems to
    //        have no effect.  Is there a way to override this behavior?
    function C() {
      var self = this instanceof C ? this : new Bare;
      self.init.apply(self, arguments);
      return self;
    }

    // C.Bare is a class with a noop constructor.  Its prototype will be
    // the same as C, so that instances of C.Bare are instances of C.
    // `new MyClass.Bare` then creates new instances of C without
    // calling .init().
    function Bare() {}
    C.Bare = Bare;

    // Extend the prototype chain: first use Bare to create an
    // uninitialized instance of the superclass, then set up Bare
    // to create instances of this class.
    var _super = Bare[prototype] = _superclass[prototype];
    var proto = Bare[prototype] = C[prototype] = C.p = new Bare;

    // pre-declaring the iteration variable for the loop below to save
    // a `var` keyword after minification
    var key;

    // set the constructor property on the prototype, for convenience
    proto.constructor = C;

    C.extend = function(def) { return P(C, def); }

    return (C.open = function(def) {
      if (typeof def === 'function') {
        // call the defining function with all the arguments you need
        // extensions captures the return value.
        def = def.call(C, proto, _super, C, _superclass);
      }

      // ...and extend it
      if (typeof def === 'object') {
        for (key in def) {
          if (ownProperty.call(def, key)) {
            proto[key] = def[key];
          }
        }
      }

      // if no init, assume we're inheriting from a non-Pjs class, so
      // default to using the superclass constructor.
      if (!('init' in proto)) proto.init = _superclass;

      return C;
    })(definition);
  }

  // as a minifier optimization, we've closured in a few helper functions
  // and the string 'prototype' (C[p] is much shorter than C.prototype)
})('prototype', ({}).hasOwnProperty);
exports.P = P;

},{}],10:[function(require,module,exports){
exports.P = require('./build/p.commonjs').P;
exports.version = require('./package.json').version;

},{"./build/p.commonjs":9,"./package.json":11}],11:[function(require,module,exports){
module.exports={
  "name": "pjs",
  "version": "5.1.1",
  "description": "A lightweight class system.  It's just prototypes!",
  "keywords": [
    "class",
    "pjs",
    "P",
    "inheritance",
    "super"
  ],
  "author": {
    "name": "Jeanine Adkisson",
    "email": "jneen at jneen dot net"
  },
  "repository": {
    "type": "git",
    "url": "git://github.com/jneen/pjs"
  },
  "files": [
    "index.js",
    "src",
    "test",
    "Makefile",
    "package.json",
    "README.md",
    "CHANGELOG.md",
    "build/p.commonjs.js"
  ],
  "main": "index.js",
  "devDependencies": {
    "mocha": "*",
    "uglify-js": "*"
  },
  "scripts": {
    "test": "make test"
  },
  "readme": "[![Build Status](https://secure.travis-ci.org/jayferd/pjs.png)](http://travis-ci.org/jayferd/pjs)\n\n# P.js\n\nP.js is a lightweight layer over javascript's built-in inheritance system that keeps all the good stuff and hides all the crap.\n\n## just show me some code already\n\nOkay.\n\n``` js\n// adapted from coffeescript.org\n// P.js exposes the `P` variable\nvar Animal = P(function(animal) {\n  animal.init = function(name) { this.name = name; };\n\n  animal.move = function(meters) {\n    console.log(this.name+\" moved \"+meters+\"m.\");\n  }\n});\n\nvar Snake = P(Animal, function(snake, animal) {\n  snake.move = function() {\n    console.log(\"Slithering...\");\n    animal.move.call(this, 5);\n  };\n});\n\nvar Horse = P(Animal, function(horse, animal) {\n  horse.move = function() {\n    console.log(\"Galloping...\");\n    animal.move.call(this, 45);\n  };\n});\n\nvar sam = Snake(\"Sammy the Python\")\n  , tom = Horse(\"Tommy the Palomino\")\n;\n\nsam.move()\ntom.move()\n```\n\n## how is pjs different from X\n\nMost class systems for JS let you define classes by passing an object.  P.js lets you pass a function instead, which allows you to closure private methods and macros.  It's also &lt;0.4kb minified (`make report`: 478).\n\n### why doesn't pjs suck?\n\nUnlike [some][prototypejs] [other][classjs] [frameworks][joose] [out][zjs] [there][structr], Pjs doesn't do any of this:\n\n- interfaces, abstract static factory factories, [and][joose] [other][prototypejs] [bloat][zjs]\n- use Object.create (it even works in IE &lt; 8!)\n- break `instanceof`\n- [hack functions onto `this` at runtime][classjs]\n- rely on magical object keys which don't minify (the only special name is `init`)\n\n[prototypejs]: http://prototypejs.org/learn/class-inheritance\n[classjs]: https://github.com/kilhage/class.js\n[zjs]: http://code.google.com/p/zjs/\n[joose]: http://joose.it\n[structr]: http://search.npmjs.org/#/structr\n\n## what can i do with pjs?\n\n- inheritable constructors (via the optional `init` method)\n- closure-based \"private\" methods (see below)\n- easily call `super` on public methods without any dirty hacks\n- instantiate your objects without calling the constructor (absolutely necessary for inheritance)\n- construct objects with variable arguments\n\n## how do i use pjs?\n\nYou can call `P` in a few different ways:\n\n``` js\n// this defines a class that inherits directly from Object.\nP(function(proto, super, class, superclass) {\n  // define private methods as regular functions that take\n  // `self` (or `me`, or `it`, or anything you really want)\n  function myPrivateMethod(self, arg1, arg2) {\n    // ...\n  }\n\n  proto.init = function() {\n    myPrivateMethod(this, 1, 2)\n  };\n\n  // you can also return an object from this function, which will\n  // be merged into the prototype.\n  return { thing: 3 };\n});\n\n// this defines a class that inherits from MySuperclass\nP(MySuperclass, function(proto, super, class, superclass) {\n  proto.init = function() {\n    // call superclass methods with super.method.call(this, ...)\n    //                           or super.method.apply(this, arguments)\n    super.init.call(this);\n  };\n});\n\n// for shorthand, you can pass an object in lieu of the function argument,\n// but you lose the niceness of super and private methods.\nP({ init: function(a) { this.thing = a } });\n\nMyClass = P(function(p) { p.init = function(a, b) { console.log(\"init!\", a, b) }; });\n// instantiate objects by calling the class as a function\nMyClass(1, 2) // => init!, 1, 2\n\n// to initialize with varargs, use `apply` like any other function.\nvar argsList = [1, 2];\nMyClass.apply(null, argsList) // init!, 1, 2\n\n// you can use it like an idiomatic class:\n// `new` is optional, not really recommended.\nnew MyClass(1, 2) // => init!, 1, 2\n// non-pjs idiomatic subclass\nfunction Subclass(a) { MyClass.call(this, a, a); }\nnew Subclass(3) // => init!, 3, 3\nnew Subclass(3) instanceof MyClass // => true\n\n// `new` may be used to \"force\" instantiation when ambiguous,\n// for example in a factory method that creates new instances\nMyClass.prototype.clone = function(a, b) {\n  return new this.constructor(a, b);\n};\n// because without `new`, `this.constructor(a, b)` is equivalent to\n// `MyClass.call(this, a, b)` which as we saw in the previous example\n// mutates `this` rather than creating new instances\n\n// allocate uninitialized objects with .Bare\n// (much like Ruby's Class#allocate)\nnew MyClass.Bare // nothing logged\nnew MyClass.Bare instanceof MyClass // => true\n\n// you can use `.open` to reopen a class.  This has the same behavior\n// as the regular definitions.\n// note that _super will still be set to the class's prototype\nMyClass = P({ a: 1 });\nvar myInst = MyClass();\nMyClass.open(function(proto) { proto.a = 2 });\nmyInst.a // => 2\nMyClass.open(function(proto, _super) { /* _super is Object.prototype here */ });\n\n// you can also use `.extend(definition)` to create new subclasses.  This is equivalent\n// to calling P with two arguments.\nvar Subclass = MyClass.extend({ a: 3 });\n```\n\n## how do i use pjs in node.js?\n\nAssuming you have it installed (via `npm install pjs`), you can import it with\n\n``` js\nvar P = require('pjs').P;\n```\n\nand go about your business.\n\n## what is all this Makefile stuff about\n\nIt's super useful! In addition to `make`, Pjs uses some build tools written on\n[Node][]. With the [Node Package Manager][npm] that comes with recent versions\nof it, just run\n\n    npm install\n\nfrom the root directory of the repo and `make` will start working.\n\n[Node]: http://nodejs.org/#download\n[npm]: http://npmjs.org\n\nHere are the things you can build:\n\n- `make minify`\n    generates `build/p.min.js`\n\n- `make commonjs`\n    generates `build/p.commonjs.js`, which is the same but has `exports.P = P` at the end\n\n- `make amd`\n    generates `build/p.amd.js`, which is the same but has `define(P)` at the end\n\n- `make test`\n    runs the test suite using the commonjs version.  Requires `mocha`.\n",
  "readmeFilename": "README.md",
  "bugs": {
    "url": "https://github.com/jneen/pjs/issues"
  },
  "_id": "pjs@5.1.1",
  "dist": {
    "shasum": "9dfc4673bb01deffd6915fb1dec75827aba42abf"
  },
  "_from": "pjs@5.x",
  "_resolved": "https://registry.npmjs.org/pjs/-/pjs-5.1.1.tgz"
}

},{}],12:[function(require,module,exports){
module.exports={
  "name": "parsimmon",
  "version": "0.5.1",
  "description": "A monadic LL(infinity) parser combinator library",
  "keywords": [
    "parsing",
    "parse",
    "parser combinators"
  ],
  "author": {
    "name": "Jeanine Adkisson",
    "email": "jneen at jneen dot net"
  },
  "repository": {
    "type": "git",
    "url": "git://github.com/jneen/parsimmon"
  },
  "files": [
    "index.js",
    "src",
    "test",
    "Makefile",
    "package.json",
    "build/parsimmon.commonjs.js",
    "build/parsimmon.browser.js",
    "build/parsimmon.browser.min.js"
  ],
  "main": "index.js",
  "devDependencies": {
    "mocha": "1.8.x",
    "chai": "1.5.x",
    "uglify-js": "2.x"
  },
  "dependencies": {
    "pjs": "5.x"
  },
  "scripts": {
    "test": "make test"
  },
  "readme": "[![Build Status](https://secure.travis-ci.org/jneen/parsimmon.png)](http://travis-ci.org/jneen/parsimmon)\n\n# Parsimmon\n\n[![Parsimmon](http://i.imgur.com/wyKOf.png)](http://github.com/jneen/parsimmon)\n\n(by @jneen and @laughinghan)\n\nParsimmon is a small library for writing big parsers made up of lots of little parsers.  The API is inspired by parsec and Promises/A.\n\n## Quick Example\n\n``` js\nvar regex = Parsimmon.regex;\nvar string = Parsimmon.string;\nvar optWhitespace = Parsimmon.optWhitespace;\nvar lazy = Parsimmon.lazy;\n\nfunction lexeme(p) { return p.skip(optWhitespace); }\n\nvar lparen = lexeme(string('('));\nvar rparen = lexeme(string(')'));\n\nvar expr = lazy('an s-expression', function() { return form.or(atom) });\n\nvar number = lexeme(regex(/[0-9]+/).map(parseInt));\nvar id = lexeme(regex(/[a-z_]\\w*/i));\n\nvar atom = number.or(id);\nvar form = lparen.then(expr.many()).skip(rparen);\n\nexpr.parse('3').value // => 3\nexpr.parse('(add (mul 10 (add 3 4)) (add 7 8))').value\n  // => ['add', ['mul', 10, ['add', 3, 4]], ['add', 7, 8]]\n```\n\n## Explanation\n\nA Parsimmon parser is an object that represents an action on a stream\nof text, and the promise of either an object yielded by that action on\nsuccess or a message in case of failure.  For example, `string('foo')`\nyields the string `'foo'` if the beginning of the stream is `'foo'`,\nand otherwise fails.\n\nThe combinator method `.map` is used to transform the yielded value.\nFor example,\n\n``` js\nstring('foo').map(function(x) { return x + 'bar'; })\n```\n\nwill yield `'foobar'` if the stream starts with `'foo'`.  The parser\n\n``` js\ndigits.map(function(x) { return parseInt(x) * 2; })\n```\n\nwill yield the number 24 when it encounters the string '12'.  The method\n`.result` can be used to set a constant result.\n\nCalling `.parse(str)` on a parser parses the string, and returns an\nobject with a `status` flag, indicating whether the parse succeeded.\nIf it succeeded, the `value` attribute will contain the yielded value.\nOtherwise, the `index` and `expected` attributes will contain the\nindex of the parse error, and a message indicating what was expected.\nThe error object can be passed along with the original source to\n`Parsimmon.formatError(source, error)` to obtain a human-readable\nerror string.\n\n## Full API\n\n### Included parsers / parser generators:\n  - `Parsimmon.string(\"my-string\")` is a parser that expects to find\n    `\"my-string\"`, and will yield the same.\n  - `Parsimmon.regex(/myregex/)` is a parser that expects the stream\n    to match the given regex.\n  - `Parsimmon.succeed(result)` is a parser that doesn't consume any of\n    the string, and yields `result`.\n  - `Parsimmon.seq(p1, p2, ... pn)` accepts a variable number of parsers\n    that it expects to find in order, yielding an array of the results.\n  - `Parsimmon.alt(p1, p2, ... pn)` accepts a variable number of parsers,\n    and yields the value of the first one that succeeds, backtracking in between.\n  - `Parsimmon.lazy(f)` accepts a function that returns a parser, which\n    is evaluated the first time the parser is used.  This is useful for\n    referencing parsers that haven't yet been defined.\n  - `Parsimmon.lazy(desc, f)` is the same as `Parsimmon.lazy` but also\n    sets `desc` as the expected value (see `.desc()` below)\n  - `Parsimmon.fail(message)`\n  - `Parsimmon.letter` is equivalent to `Parsimmon.regex(/[a-z]/i)`\n  - `Parsimmon.letters` is equivalent to `Parsimmon.regex(/[a-z]*/i)`\n  - `Parsimmon.digit` is equivalent to `Parsimmon.regex(/[0-9]/)`\n  - `Parsimmon.digits` is equivalent to `Parsimmon.regex(/[0-9]*/)`\n  - `Parsimmon.whitespace` is equivalent to `Parsimmon.regex(/\\s+/)`\n  - `Parsimmon.optWhitespace` is equivalent to `Parsimmon.regex(/\\s*/)`\n  - `Parsimmon.any` consumes and yields the next character of the stream.\n  - `Parsimmon.all` consumes and yields the entire remainder of the stream.\n  - `Parsimmon.eof` expects the end of the stream.\n  - `Parsimmon.index` is a parser that yields the current index of the parse.\n  - `Parsimmon.test(pred)` yield a single characer if it passes the predicate.\n  - `Parsimmon.takeWhile(pred)` yield a string containing all the next characters that pass the predicate.\n\n### Adding base parsers\n\nYou can add a primitive parser (similar to the included ones) by using\n`Parsimmon.custom`. This is an example of how to create a parser that matches\nany character except the one provided:\n\n```js\nfunction notChar(char) {\n  return Parsimmon.custom(function(success, failure) {\n    return function(stream, i) {\n      if (stream.charAt(i) !== char && stream.length <= i) {\n        return success(i+1, stream.charAt(i));\n      }\n      return failure(i, 'anything different than \"' + char + '\"');\n    }\n  });\n}\n```\n\nThis parser can then be used and composed the same way all the existing ones are\nused and composed, for example:\n\n```js\nvar parser = seq(string('a'), notChar('b').times(5));\nparser.parse('accccc');\n```\n\n### Parser methods\n  - `parser.or(otherParser)`:\n    returns a new parser which tries `parser`, and if it fails uses `otherParser`.\n  - `parser.chain(function(result) { return anotherParser; })`:\n    returns a new parser which tries `parser`, and on success calls the\n    given function with the result of the parse, which is expected to\n    return another parser, which will be tried next.  This allows you\n    to dynamically decide how to continue the parse, which is impossible\n    with the other combinators.\n  - `parser.then(anotherParser)`:\n    expects `anotherParser` to follow `parser`, and yields the result\n    of `anotherParser`.  NB: the result of `parser` here is ignored.\n  - `parser.map(function(result) { return anotherResult; })`:\n    transforms the output of `parser` with the given function.\n  - `parser.skip(otherParser)`\n    expects `otherParser` after `parser`, but preserves the yield value\n    of `parser`.\n  - `parser.result(aResult)`:\n    returns a new parser with the same behavior, but which yields `aResult`.\n  - `parser.many()`:\n    expects `parser` zero or more times, and yields an array of the results.\n  - `parser.times(n)`:\n    expects `parser` exactly `n` times, and yields an array of the results.\n  - `parser.times(min, max)`:\n    expects `parser` between `min` and `max` times, and yields an array\n    of the results.\n  - `parser.atMost(n)`:\n    expects `parser` at most `n` times.  Yields an array of the results.\n  - `parser.atLeast(n)`:\n    expects `parser` at least `n` times.  Yields an array of the results.\n  - `parser.mark()` yields an object with `start`, `value`, and `end` keys, where\n    `value` is the original value yielded by the parser, and `start` and `end` are\n    the indices in the stream that contain the parsed text.\n  - `parser.desc(description)` returns a new parser whose failure message is the passed\n    description.  For example, `string('x').desc('the letter x')` will indicate that\n    'the letter x' was expected.\n\n## Tips and patterns\n\nThese apply to most parsers for traditional langauges - it's possible\nyou may need to do something different for yours!\n\nFor most parsers, the following format is helpful:\n\n1. define a `lexeme` function to skip all the stuff you don't care\n   about (whitespace, comments, etc).  You may need multiple types of lexemes.\n   For example,\n\n    ``` js\n    var ignore = whitespace.or(comment.many());\n    function lexeme(p) { return p.skip(ignore); }\n    ```\n\n1. Define all your lexemes first.  These should yield native javascript values.\n\n    ``` js\n    var lparen = lexeme(string('('));\n    var rparen = lexeme(string(')'));\n    var number = lexeme(regex(/[0-9]+/)).map(parseInt);\n    ```\n\n1. Forward-declare one or more top-level expressions with `lazy`,\n   referring to parsers that have not yet been defined.  Generally, this\n   takes the form of a large `.alt()` call\n\n    ``` js\n    var expr = lazy('an expression', function() { return Parsimmon.alt(p1, p2, ...); });\n    ```\n\n1. Then build your parsers from the inside out - these should return\n   AST nodes or other objects specific to your domain.\n\n    ``` js\n    var p1 = ...\n    var p2 = ...\n    ```\n\n1. Finally, export your top-level parser.  Remember to skip ignored\n   stuff at the beginning.\n\n    ``` js\n    return ignore.then(expr.many());\n    ```\n\n### Fantasyland\n\n[fantasyland]: https://github.com/fantasyland/fantasy-land \"Fantasyland\"\n[fantasyland-logo]: https://github.com/fantasyland/fantasy-land/raw/master/logo.png\n\n![][fantasyland-logo]\n\nParsimmon is also compatible with [fantasyland][].  It is a Semigroup, an Applicative Functor and a Monad.\n",
  "readmeFilename": "README.md",
  "bugs": {
    "url": "https://github.com/jneen/parsimmon/issues"
  },
  "_id": "parsimmon@0.5.1",
  "dist": {
    "shasum": "247c970d7d5e99a51115b16a106de96f0eb9303b"
  },
  "_from": "parsimmon@~0.5.1",
  "_resolved": "https://registry.npmjs.org/parsimmon/-/parsimmon-0.5.1.tgz"
}

},{}],13:[function(require,module,exports){
var Util = require("util");

var toString = Object.prototype.toString;

/*
	isString(s) Returns true if the passed in object (o) is a String.
*/
Util.isString = function(s) {
	if (s===undefined || s===null) return false;
	return s.constructor===String;
};

/*
	isFunction(s) Returns true if the passed in object (o) is a Function.
*/
Util.isFunction = function(f) {
	if (f===undefined || f===null) return false;
	return f.constructor===Function;
};

/*
	isNumber(s) Returns true if the passed in object (o) is a Number, Infinity,
	or NaN.  Any Number type, integer, float, etc, will return true;
*/
Util.isNumber = function(n) {
	if (n===undefined || n===null) return false;
	return n.constructor===Number;
};

/*
	isBoolean(s) Returns true if the passed in object (o) is a Boolean,
	true, or false.
*/
Util.isBoolean = function(b) {
	if (b===undefined || b===null) return false;
	return b.constructor===Boolean;
};

/*
	isDefined(s) Returns true if the passed in object (o) is not undefined.
*/
Util.isDefined = function(o) {
	return o!==undefined;
};

/*
	isEmpty(s) Returns true if the passed in object (o) is a undefined,
	null, an empty array, or an empty string.  0 and false are not technically
	empty, so those values return true;
*/
Util.isEmpty = function(o) {
	if (o===undefined || o===null) return true;
	if (Util.isArray(o) && o.length===0) return true;
	if (Util.isString(o) && o.length===0) return true;
	if (Util.isPureObject(o) && Object.keys(o).length===0) return true;
	return false;
};

/*
	isUndefined(s) Returns true if the passed in object (o) is not undefined.
*/
Util.isUndefined = function(o) {
	return o===undefined;
};

/*
	isObject(s) Returns true if the passed in object (o) is a Object, which
	is everything that is not undefined.
*/
Util.isObject = function(o) {
	return o!==undefined;
};

/*
	isPureObject(o) Returns true if the passed in object (o) is defined 
	and not a function, string, number, boolean, array, date, RegExp, or Error.
*/
Util.isPureObject = function(o) {
	return o!==undefined && 
		   o!==null &&
		   !Util.isFunction(o) && 
		   !Util.isString(o) && 
		   !Util.isNumber(o) && 
		   !Util.isBoolean(o) && 
		   !Util.isArray(o)  && 
		   !Util.isDate(o) && 
		   !Util.isRegExp(o) && 
		   !Util.isError(o);
};

},{"util":6}],"set":[function(require,module,exports){
/* The MIT License (MIT)

Copyright (c) 2011-2012 George "Gary" Katsevman

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE S
OFTWARE.
*/

var Set = function () {

var value = true
  , jsonify = function (item) {
     if (typeof item === "object") {
       return item = JSON.stringify(item)
     }
     return item;
  }
  , unique = function(iset){
      var set = Object.create(null)
        , i = 0
        , l = iset.length

      for(; i < l; i++) {
        set[jsonify(iset[i])] = value
      }

      return set
  }

var Set = function(input){
  this._set = unique(input || [])
}

Set.prototype.contains = function(prop){
  return !!this._set[jsonify(prop)]
}

Set.prototype.empty = function(){
  return Object.keys(this._set).length == 0
}

Set.prototype.size = function(){
  return Object.keys(this._set).length
}

Set.prototype.get = function(){
  return Object.keys(this._set)
}

Set.prototype.add = function(prop){
  this._set[jsonify(prop)] = value
}

Set.prototype.remove = function(prop){
  delete this._set[jsonify(prop)]
}

Set.prototype.union = function(iset){
  return new Set(this.get().concat(iset.get()))
}


Set.prototype.intersect = function(iset){
  var items = iset.get()
    , i = 0
    , l = items.length
    , oset = new Set()
    , prop

  for(; i < l; i++){
    prop = items[i]
    if(this.contains(prop)){
      oset.add(prop)
    }
  }

  items = this.get()

  for(i = 0, l = items.length; i < l; i++){
    prop = items[i]
    if(iset.contains(prop)){
      oset.add(prop)
    }
  }

  return oset
}

Set.prototype.difference = function(iset){
  var items = iset.get()
    , i = 0
    , l = items.length
    , oset = this.union(iset)
    , prop

  for(; i < l; i++){
    prop = items[i]
    if(this.contains(prop)){
      oset.remove(prop)
    }
  }

  return oset
}

Set.prototype.subset = function(iset){
  var items = iset.get()
    , subset = false
    , i = 0
    , l = items.length

  for(; i < l; i++){
    prop = items[i]
    if(this.contains(prop)){
      subset = true
    }
    else{
      subset = false
      break
    }
  }

  return subset
}

Set.prototype.find = function(pred){
  return this.get().filter(pred)
}

Set.prototype.clear = function(){
  this._set = Object.create(null)
}

Set.unique = function(iset){
  return Object.keys(unique(iset))
}

return Set

}()

if(typeof module === 'object' && module.hasOwnProperty('exports')){
  module.exports = Set;
}

},{}]},{},[]);
