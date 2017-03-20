let _ = require('lodash');

/**
 * Defines a contract between two parameters.
 *
 * @param {string} config.p1Name  First parameter name
 * @param {string} config.p2Name  Second parameter name
 * @param {function} config.verify  Checks if the contract between the two
 *                                  parameters have been broken. Takes the value
 *                                  of p1 and p2 as parameters.
 * @param {string} config.messageOnBroken  Error message the API will send if
 *                                         the contract is broken
 * @param {Number} [config.statusOnBroken=400] HTTP status the API will send if
 *                                             the contract is broken
 */
module.exports = function Contract(config) {
    verifyConfig(config);
    this.p1Name = config.p1Name;
    this.p2Name = config.p2Name;
    this.valid = undefined; // don't know if it's valid yet
    let self = this;

    this.apply = function(allParams) {
        let p1 = _.find(allParams, p => p.name === this.p1Name);
        if (p1 === null)
            throw new Error(`could not find parameter '${this.p1Name}'`);

        let p2 = _.find(allParams, p => p.name === this.p2Name);
        if (p2 === null)
            throw new Error(`could not find parameter '${this.p2Name}'`);

        this.valid = config.verify(p1.value, p2.value);
        if (!this.valid) {
            this.error = {
                msg: config.messageOnBroken,
                status: config.statusOnBroken,
                data: {
                    [this.p1Name]: p1.value,
                    [this.p2Name]: p2.value
                }
            };
        }
    };
};

let verifyConfig = function(config) {
    let strings = ['p1Name', 'p2Name', 'messageOnBroken'];
    for (let prop of strings) {
        if (typeof config[prop] !== 'string' || config[prop].length === 0)
            throw new Error(`config.${prop} must be a string with length > 0`);
    }

    if (typeof config.verify !== 'function')
        throw new Error('config.verify must be a function');

    // statusOnBroken defaults to 400 and must be a number
    if (config.statusOnBroken === undefined)
        config.statusOnBroken = 400;
    if (typeof config.statusOnBroken !== 'number')
        throw new Error('config.statusOnBroken must be a number');
}
