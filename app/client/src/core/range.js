/**
 * range.js -- simple range operations. An object is considered to be a "range
 * object" if it has four numerical properties: start, end, delta, and middle.
 * Note that ranges created from range.create() are read-only via Object.freeze()
 */

let _ = require('lodash');

/**
 * Checks if small can be completely encompassed within big, where big and small
 * are range objects.
 */
module.exports.contained = function(big, small) {
    return big.start <= small.start && big.end >= small.end;
};

/**
 * Returns a range that is bounded by the "limit" range. The resulting range's
 * start will be the start of the limit range or the start of the original range,
 * whichever is larger, and similarly for the end.
 *
 * @param  {range} range
 * @param  {range} limit
 * @return {range}       A new range whose start and end are bounded by the
 *                       start and end of the limit range
 */
module.exports.boundBy = function(range, limit) {
    let start = range.start, end = range.end;
    if (range.start < limit.start)
        start = limit.start;
    if (range.end > limit.end)
        end = limit.end;

    return module.exports.create(start, end);
};

/**
 * Creates a copy of a range
 * @param  {range} range
 */
module.exports.copy = function(range) {
    return module.exports.create(range.start, range.end);
};

/**
 * Creates a new range. The resulting object will be frozen via Object.freeze()
 * and have `start`, `end`, `delta`, and `middle` properties
 * @param  {number} start
 * @param  {number} end
 */
module.exports.create = function(start, end) {
    if (typeof start !== 'number')
        throw new Error('start must be a number, was ' + start);
    if (typeof end !== 'number')
        throw new Error('end must be a number, was ' + end);

    if (end < start) throw new Error(`backwards range (expecting ${start} to be less than ${end})`);
    return Object.freeze({
        start: start,
        end: end,
        delta: end - start,
        middle: start + (end - start) / 2
    });
};
