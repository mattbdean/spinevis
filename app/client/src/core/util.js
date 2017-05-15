const moment = require('moment');
require('moment-duration-format');

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
            const diffInMillis = new Date(end).getTime() - new Date(start).getTime();
            return moment.duration(diffInMillis, 'milliseconds').format(FORMAT_DURATION);
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
    }
};
