/**
 * range.js -- simple range operations. An object is considered to be a "range
 * object" if it has two numerical properties called 'start' and 'end'. Note
 * for functions that take an array of ranges, order does matter. For all ranges
 * in the array, range[i].start < range[i].end and range[i].end <
 * range[i + 1].start.
 */

let _ = require('lodash');

/**
 * Checks if small can be completely encompassed within big, where big and small
 * are range objects.
 */
module.exports.contained = function(big, small) {
    return big.start <= small.start && big.end >= small.end;
};

module.exports.boundBy = function(range, limit) {
    if (range.start < limit.start)
        range.start = limit.start;
    if (range.end > limit.end)
        range.end = limit.end;

    return range;
};

module.exports.copy = function(range) {
    return module.exports.create(range.start, range.end);
};

module.exports.fromPadding = function(center, padding) {
    return module.exports.create(center - padding, center + padding);
};

module.exports.create = function(start, end) {
    if (end < start) throw new Error(`backwards range (expecting ${start} to be less than ${end})`);
    return {
        start: start,
        end: end,
        delta: end - start,
        middle: start + (end - start) / 2
    };
};
