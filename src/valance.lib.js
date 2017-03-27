"use strict";
const tsc = require("typescript-compiler");
class Valance {
    constructor(options) {
        tsc.compile(["./src/valance.ts"], ["--out", "./dist/main.js"]);
    }
}
exports.Valance = Valance;
