let moment = require('moment');
require('moment-duration-format');

const FORMAT_DATE = 'D MMMM YYYY';
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
        dateTime: function(date) {
            return moment(date).format(FORMAT_DATE_TIME);
        }
    }
};
