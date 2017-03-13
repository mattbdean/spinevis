/**
 * range.js -- simple range operations. An object is considered to be a "range
 * object" if it has two numerical properties called 'start' and 'end'. Note
 * for functions that take an array of ranges, order does matter. For all ranges
 * in the array, range[i].start < range[i].end and range[i].end <
 * range[i + 1].start.
 */

let _ = require('lodash');

/**
 * Condenses two or more range objects to be as succinct as possible
 * @param ranges    An array of range objects
 * @return {array}  A simplified range list
 */
module.exports.merge = function(ranges) {
    let merged = _.slice(ranges, 0);

    for (let i = merged.length - 1; i > 0; i--) {
        if (merged[i - 1].end >= merged[i].start) {
            merged[i - 1] = {start: merged[i - 1].start, end: merged[i].end};
            merged.splice(i, 1);
        }
    }

    return merged;
};

/**
 * Checks if small can be completely encompassed within big, where big and small
 * are range objects.
 */
module.exports.contained = function(big, small) {
    return big.start < small.start && big.end > small.end;
};

/**
 * Returns a range object that will squeeze into ranges such that
 * merge(newRanges) has the potential to yield up to two less objects. For
 * example, if ranges are [0, 10] and [20, 30], and fit is [5, 25], the
 * resulting range will be [10, 20].
 */
module.exports.squeeze = function(ranges, fit) {
    let newRange = fit;

    let lastIndex = ranges.length;
    let i = 0;
    while (i < lastIndex) {
        let range = ranges[i];

        if (fit.start > range.start && fit.start < range.end) {
            fit.start = range.end;
            // Still the possibility of finding an adjustment to fit.end in
            // the next range
            lastIndex = Math.min(i + 2, ranges.length);
        }
        if (fit.end < range.end && fit.end > range.start) {
            fit.end = range.start;
            // Any adjustment to fit.start would have already happened by now
            lastIndex = -1;
        }
        i++;
    }

    return fit;
};

module.exports.create = function(start, end) {
    let first = Math.min(start, end);
    let last = Math.max(start, end);
    return {start: first, end: last};
};
