"use strict";

exports.__esModule = true;

describe("Valance Distribution Files", function() {
    var valance;
    beforeEach(function() {
        valance.cli("./dist/valance.cli.js");
        valance.lib("./dist/valance.lib.js");
    });
    it("Checks to see if all distribution files have been built.", function() {});
});