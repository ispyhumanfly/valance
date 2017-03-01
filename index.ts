/* tslint:enable */

/// <reference path="./typings/index.d.ts" />

"use strict";

const tsc = require("typescript-compiler")

export class ArchPortal {

    public options: Object

    constructor (options: Object) {

        tsc.compile(["./src/main.ts"], ["--out", "./src/main.js"])

    }
}