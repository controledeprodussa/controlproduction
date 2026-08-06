/* Polyfills para navegadores antigos de Smart TV (LG webOS, Philco, Toshiba, etc.)
   Arquivo em ES5 puro: precisa ser parseável por Chromium >= 38. */
(function () {
  "use strict";

  // globalThis (Chrome 71)
  if (typeof globalThis === "undefined") {
    try {
      Object.defineProperty(Object.prototype, "__magic__", {
        get: function () {
          return this;
        },
        configurable: true,
      });
      // eslint-disable-next-line no-undef
      __magic__.globalThis = __magic__;
      delete Object.prototype.__magic__;
    } catch (e) {
      if (typeof window !== "undefined") window.globalThis = window;
    }
  }

  var G = typeof globalThis !== "undefined" ? globalThis : window;

  function def(obj, name, value) {
    if (!obj || obj[name]) return;
    try {
      Object.defineProperty(obj, name, {
        value: value,
        writable: true,
        configurable: true,
      });
    } catch (e) {
      obj[name] = value;
    }
  }

  // ---- Object ----
  def(Object, "hasOwn", function (o, k) {
    return Object.prototype.hasOwnProperty.call(Object(o), k);
  });
  def(Object, "fromEntries", function (entries) {
    var out = {};
    var list = entries;
    if (list && typeof list.forEach === "function") {
      list.forEach(function (p) {
        out[p[0]] = p[1];
      });
    } else {
      var arr = Array.prototype.slice.call(list || []);
      for (var i = 0; i < arr.length; i++) out[arr[i][0]] = arr[i][1];
    }
    return out;
  });

  // ---- Array ----
  def(Array.prototype, "at", function (n) {
    n = Math.trunc(n) || 0;
    if (n < 0) n += this.length;
    if (n < 0 || n >= this.length) return undefined;
    return this[n];
  });
  def(Array.prototype, "flat", function (depth) {
    var d = depth === undefined ? 1 : Number(depth) || 0;
    var out = [];
    (function flatten(arr, level) {
      for (var i = 0; i < arr.length; i++) {
        if (Array.isArray(arr[i]) && level > 0) flatten(arr[i], level - 1);
        else out.push(arr[i]);
      }
    })(this, d);
    return out;
  });
  def(Array.prototype, "flatMap", function (fn, thisArg) {
    var out = [];
    for (var i = 0; i < this.length; i++) {
      var r = fn.call(thisArg, this[i], i, this);
      if (Array.isArray(r)) out.push.apply(out, r);
      else out.push(r);
    }
    return out;
  });
  def(Array.prototype, "findLast", function (fn, thisArg) {
    for (var i = this.length - 1; i >= 0; i--) {
      if (fn.call(thisArg, this[i], i, this)) return this[i];
    }
    return undefined;
  });
  def(Array.prototype, "findLastIndex", function (fn, thisArg) {
    for (var i = this.length - 1; i >= 0; i--) {
      if (fn.call(thisArg, this[i], i, this)) return i;
    }
    return -1;
  });
  def(Array.prototype, "includes", function (x, from) {
    var len = this.length >>> 0;
    var i = from | 0;
    if (i < 0) i = Math.max(len + i, 0);
    for (; i < len; i++) {
      if (this[i] === x || (x !== x && this[i] !== this[i])) return true;
    }
    return false;
  });
  def(Array.prototype, "toSorted", function (cmp) {
    return Array.prototype.slice.call(this).sort(cmp);
  });
  def(Array.prototype, "toReversed", function () {
    return Array.prototype.slice.call(this).reverse();
  });

  // ---- String ----
  def(String.prototype, "replaceAll", function (search, replacement) {
    if (Object.prototype.toString.call(search) === "[object RegExp]") {
      return this.replace(search, replacement);
    }
    return this.split(search).join(replacement);
  });
  def(String.prototype, "trimStart", String.prototype.trimLeft || function () {
    return this.replace(/^[\s\uFEFF\xA0]+/, "");
  });
  def(String.prototype, "trimEnd", String.prototype.trimRight || function () {
    return this.replace(/[\s\uFEFF\xA0]+$/, "");
  });
  def(String.prototype, "at", function (n) {
    n = Math.trunc(n) || 0;
    if (n < 0) n += this.length;
    if (n < 0 || n >= this.length) return undefined;
    return this.charAt(n);
  });

  // ---- Promise ----
  if (typeof Promise !== "undefined") {
    def(Promise, "allSettled", function (promises) {
      return Promise.all(
        Array.prototype.map.call(promises, function (p) {
          return Promise.resolve(p).then(
            function (value) {
              return { status: "fulfilled", value: value };
            },
            function (reason) {
              return { status: "rejected", reason: reason };
            },
          );
        }),
      );
    });
    def(Promise, "any", function (promises) {
      return new Promise(function (resolve, reject) {
        var list = Array.prototype.slice.call(promises);
        var errors = [];
        var pending = list.length;
        if (!pending) reject(new Error("All promises were rejected"));
        list.forEach(function (p, i) {
          Promise.resolve(p).then(resolve, function (err) {
            errors[i] = err;
            if (--pending === 0) reject(new Error("All promises were rejected"));
          });
        });
      });
    });
    def(Promise.prototype, "finally", function (cb) {
      return this.then(
        function (v) {
          return Promise.resolve(cb()).then(function () {
            return v;
          });
        },
        function (e) {
          return Promise.resolve(cb()).then(function () {
            throw e;
          });
        },
      );
    });
  }

  // ---- Misc globals ----
  def(G, "queueMicrotask", function (cb) {
    Promise.resolve().then(cb);
  });
  def(G, "structuredClone", function (value) {
    return JSON.parse(JSON.stringify(value));
  });
  def(Number, "isNaN", function (v) {
    return typeof v === "number" && v !== v;
  });
  def(Number, "isInteger", function (v) {
    return typeof v === "number" && isFinite(v) && Math.floor(v) === v;
  });

  // ---- ResizeObserver (usado pelos gráficos) ----
  if (typeof G.ResizeObserver === "undefined" && typeof window !== "undefined") {
    var Observer = function (callback) {
      this._cb = callback;
      this._targets = [];
      this._sizes = [];
      var self = this;
      this._tick = function () {
        var entries = [];
        for (var i = 0; i < self._targets.length; i++) {
          var el = self._targets[i];
          var rect = el.getBoundingClientRect();
          var prev = self._sizes[i];
          if (!prev || prev.w !== rect.width || prev.h !== rect.height) {
            self._sizes[i] = { w: rect.width, h: rect.height };
            entries.push({
              target: el,
              contentRect: rect,
              borderBoxSize: [{ inlineSize: rect.width, blockSize: rect.height }],
              contentBoxSize: [{ inlineSize: rect.width, blockSize: rect.height }],
            });
          }
        }
        if (entries.length) {
          try {
            self._cb(entries, self);
          } catch (e) {
            /* noop */
          }
        }
      };
    };
    Observer.prototype.observe = function (el) {
      if (this._targets.indexOf(el) === -1) {
        this._targets.push(el);
        this._sizes.push(null);
      }
      if (!this._timer) this._timer = setInterval(this._tick, 250);
      this._tick();
    };
    Observer.prototype.unobserve = function (el) {
      var i = this._targets.indexOf(el);
      if (i !== -1) {
        this._targets.splice(i, 1);
        this._sizes.splice(i, 1);
      }
    };
    Observer.prototype.disconnect = function () {
      this._targets = [];
      this._sizes = [];
      if (this._timer) {
        clearInterval(this._timer);
        this._timer = null;
      }
    };
    G.ResizeObserver = Observer;
  }

  // ---- IntersectionObserver (shim mínimo: considera tudo visível) ----
  if (typeof G.IntersectionObserver === "undefined" && typeof window !== "undefined") {
    var IO = function (cb) {
      this._cb = cb;
    };
    IO.prototype.observe = function (el) {
      var cb = this._cb;
      var self = this;
      setTimeout(function () {
        try {
          cb([{ target: el, isIntersecting: true, intersectionRatio: 1 }], self);
        } catch (e) {
          /* noop */
        }
      }, 0);
    };
    IO.prototype.unobserve = function () {};
    IO.prototype.disconnect = function () {};
    IO.prototype.takeRecords = function () {
      return [];
    };
    G.IntersectionObserver = IO;
  }
})();
