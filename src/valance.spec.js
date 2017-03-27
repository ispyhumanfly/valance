"use strict";
describe("Valance Distribution Files", () => {
    let valance;
    beforeEach(() => {
        valance.cli("./dist/valance.cli.js");
        valance.lib("./dist/valance.lib.js");
    });
    it("Checks to see if all distribution files have been built.", () => {
    });
});
