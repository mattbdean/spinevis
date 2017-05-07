const moment = require('moment');
require('moment-duration-format');
const paramCase = require('param-case');

// Default date format, creates date strings like '22 January 1998' when used by
// moment.
const FORMAT_DATE = 'D MMMM YYYY';

// Use moment's default formatting for the current locale
const FORMAT_DATE_SHORT = 'l';

const FORMAT_DATE_TIME = 'D MMMM YYYY, h:mm:ss a';
const FORMAT_DURATION = 'h[h] m[m]';

module.exports = {
    format: {
        /**
         * Calculates the difference in minutes between start and end, where both
         * parameters are valid inputs to the Date constructor.
         */
        duration: function(start, end) {
            let diffInMillis = new Date(end).getTime() - new Date(start).getTime();
            return moment.duration(diffInMillis, "milliseconds").format(FORMAT_DURATION);
        },
        /** Formats a date */
        date: function(date) {
            return moment(date).format(FORMAT_DATE);
        },
        /** Formas a short date */
        dateShort: function(date) {
            return moment(date).format(FORMAT_DATE_SHORT);
        },
        /** Formats a date to include time as well */
        dateTime: function(date) {
            return moment(date).format(FORMAT_DATE_TIME);
        }
    },
    /**
     * Uses SystemJS's css plugin to import a CSS file pertaining to the given
     * spec. Expects that all CSS files are served at `/style`.
     *
     * @param  {*} spec The CSS file specification. If spec is an object, the
     *                  value of the `name` property formatted as kebab case
     *                  will be used. For example, if `spec.name` is
     *                  `mySuperAwesomeComponent`, the value this function will
     *                  use is `my-super-awesome-component`. Can also be a string
     */
    css: function(spec, useMinified = true) {
        let identifier = spec;

        if (typeof spec === 'object' && spec.name !== undefined) {
            identifier = paramCase(spec.name);
        }

        if (useMinified) identifier += '.min';
        identifier += '.css';

        // Add '!' to the end so SystemJS knows to use a plugin (in this case,
        // the CSS plugin)
        System.import(`/style/${identifier}!`);
    }
};
