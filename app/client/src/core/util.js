let moment = require('moment');
require('moment-duration-format');

module.exports = {
    /**
     * Calculates the difference in minutes between start and end, where both
     * parameters are an ISO-formatted time string.
     */
    formatDifference: function(start, end) {
        let diffInMillis = new Date(end).getTime() - new Date(start).getTime();
        return moment.duration(diffInMillis, "milliseconds").format('h[h] m[m]');
    }
};
