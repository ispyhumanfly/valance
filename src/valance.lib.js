"use strict";

exports.__esModule = true;

var tsc = require("typescript-compiler");

var Valance = function() {
    function Valance(options) {
        tsc.compile([ "./src/valance.ts" ], [ "--out", "./dist/main.js" ]);
    }
    return Valance;
}();

exports.Valance = Valance;