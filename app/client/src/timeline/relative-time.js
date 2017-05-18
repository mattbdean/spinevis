/**
 * relative-time.js -- variables and functions to deal with relative times, and
 * converting to absolute times.
 */

// Stolen from http://stackoverflow.com/a/11888430
const year = new Date().getFullYear();
const jan = new Date(year, 0, 1);
const jul = new Date(year, 6, 1);
const timezoneOffsetStandard = Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());

const timezoneOffsetAdjusted = new Date().getTimezoneOffset() > timezoneOffsetStandard ?
    // Add 1 hour for DST
    timezoneOffsetStandard + 60 : timezoneOffsetStandard;

/** Offset in milliseconds of timezone. Accounds for daylight savings time. */
const timezoneOffsetMillis = timezoneOffsetAdjusted * 60 * 1000;
module.exports.timezoneOffsetMillis = timezoneOffsetMillis;

/**
 * In order to get Plotly to display a date on the x-axis, we assume our
 * time series data starts at unix time 0 (12:00 AM @ 1 Jan 1970). Doing this is
 * the least computationally expensive starting position for showing relative
 * times. Think of this less as a "hack" and more of a "workaround."
 *
 * N.B. Will not work as expected if relativeSeconds is greater than the
 * amount of seconds in one day
 *
 * @param utc If false, will account for timezone offset
 *
 * @return Unix time at the millisecond resolution that can be plotted and
 *         formatted with a time-only date format to reveal a pseudo-duration
 *         format.
 */
module.exports.relativeMillis = function(relativeSeconds, utc = false) {
    // Plotly assumes input dates are in UTC, adjust for timezone offset
    let millis = relativeSeconds * 1000;
    if (!utc) {
        millis += timezoneOffsetMillis;
    }

    return millis;
};

/**
 * Converts the amount of milliseconds into the session to the approximate
 * (maximum error of 1) index of that timepoint. For example, 0 milliseconds
 * would be converted into the 0th index, 35 millis results in 1 (assuming the
 * session was imaged at ~14 Hz), 106 millis results in 2, etc.
 *
 * @param  {array} relTimes An array of relative times whose elements correspond
 *                          to the time (in seconds) at which each imaging event
 *                          occured.
 */
module.exports.toIndex = function(relTimes, millis) {
    // Because of the way inexactBinarySearch works, a relative time equal to
    // Infinity or greater than the last element will return one less than
    // expected. We manually fix that here.
    return millis === Infinity || (millis / 1000) > relTimes[relTimes.length - 1] ?
        relTimes.length - 1 : inexactBinarySearch(relTimes, millis / 1000);
};

/**
 * Performs an inexact binary search to find the index of the element that
 * is closest in value to the item given. Adapted from
 * http://oli.me.uk/2014/12/17/revisiting-searching-javascript-arrays-with-a-binary-search/
 */
const inexactBinarySearch = function(list, item) {
    let min = 0;
    let max = list.length - 1;
    let guess;

    while (min <= max) {
        guess = Math.floor((min + max) / 2);

        if (list[guess] === item) {
            return guess;
        } else {
            if (list[guess] < item) {
                min = guess + 1;
            } else {
                max = guess - 1;
            }
        }
    }

    // A normal binary search would return -1 at this point. However, since
    // we're doing an inexact binary search, we know the value of item
    // is less than list[guess], so return guess - 1
    return guess === 0 ? 0 : guess - 1;
};
