/// <reference path="../typings/index.d.ts" />

/* tslint:enable */

"use strict";

export class Valance {

    public params: Object

    constructor (params: Object) {

        let exec = require("child_process").execSync
        let valance_cli = exec(`node valance.cli.js --name ${params.name} `)
    }
}