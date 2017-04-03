let moment = require('moment');
require('moment-duration-format');
let paramCase = require('param-case');

const FORMAT_DATE = 'D MMMM YYYY';

// Use moment's default formatting for the current locale
const FORMAT_DATE_SHORT = 'l';

const FORMAT_DATE_TIME = 'D MMMM YYYY, h:mm:ss a';
const FORMAT_DURATION = 'h[h] m[m]';

module.exports = {
    format: {
        /**
         * Calculates the difference in minutes between start and end, where both
         * parameters are an ISO-formatted time string.
         */
        duration: function(start, end) {
            let diffInMillis = new Date(end).getTime() - new Date(start).getTime();
            return moment.duration(diffInMillis, "milliseconds").format(FORMAT_DURATION);
        },
        date: function(date) {
            return moment(date).format(FORMAT_DATE);
        },
        dateShort: function(date) {
            return moment(date).format(FORMAT_DATE_SHORT);
        },
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
     *                  use is `my-super-awesome-component`.
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
