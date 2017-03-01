/// <reference path="./typings/index.d.ts" />
/* tslint:enable */

"use strict";

const tsc = require("typescript-compiler")

export class Valance {

    public options: Object

    constructor (options: Object) {

        tsc.compile(["./src/valance.ts"], ["--out", "./dist/main.js"])

    }
}