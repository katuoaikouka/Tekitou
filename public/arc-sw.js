/* SenninProxy - Arc Service Worker */
! function(e) {
    var t = {};
    function r(n) {
        if (t[n]) return t[n].exports;
        var o = t[n] = { i: n, l: !1, exports: {} };
        return e[n].call(o.exports, o, o.exports, r), o.l = !0, o.exports
    }
    r.m = e, r.c = t, r.d = function(e, t, n) {
        r.o(e, t) || Object.defineProperty(e, t, { enumerable: !0, get: n })
    }, r.r = function(e) {
        "undefined" != typeof Symbol && Symbol.toStringTag && Object.defineProperty(e, Symbol.toStringTag, { value: "Module" }), Object.defineProperty(e, "__esModule", { value: !0 })
    }, r.p = "", r(r.s = 100)
}({
    100: function(e, t, r) {
        "use strict";
        r.r(t);
        var n = r(3);
        if ("undefined" != typeof ServiceWorkerGlobalScope) {
            importScripts("https://arc.io" + n.k);
        } else if ("undefined" != typeof SharedWorkerGlobalScope) {
            importScripts("https://arc.io" + n.i);
        } else if ("undefined" != typeof DedicatedWorkerGlobalScope) {
            importScripts("https://arc.io" + n.b);
        }
    },
    3: function(e, t, r) {
        "use strict";
        r.d(t, "i", function() { return "/shared-worker.js" });
        r.d(t, "b", function() { return "/dedicated-worker.js" });
        r.d(t, "k", function() { return "/arc-sw-core.js" });
    }
});
