const util = require('../core/util.js');
const moment = require('moment');
const numeral = require('numeral');
const _ = require('lodash');

const ctrlDef = ['$scope', 'title', 'session', function($scope, title, session) {
    // Use base title
    title.useBase();

    const $ctrl = this;

    // Format a date like '1 January 1970' with this spec:
    // https://docs.angularjs.org/api/ng/filter/date
    $ctrl.dateFormat = 'd MMMM yyyy';
    // Moment equivalent of $ctrl.dateFormat
    const momentInputFormat = 'D MMMM YYYY';
    // Format that the API expects
    const momentOutputFormat = 'YYYY-MM-DD';

    // Will be populated with a 'start' and 'end' property of formatted dates
    // with $ctrl.dateFormat
    $ctrl.dateRange = {};
    $ctrl.loading = false;
    $ctrl.sessions = [];
    $ctrl.animal = '';

    // Pagination variables
    let start = 0;
    const limitFirst = 50;
    const limitNext = 20;
    let hasMore = true;
    let loading = false;

    $ctrl.dateBounds = {
        start: moment().format(),
        end: moment().format()
    };

    $scope.$watchCollection('$ctrl.dateRange', () => {
        $ctrl.sessions = [];

        // Parse dates into moment objects
        const [startDate, endDate] = parseDateRange($ctrl.dateRange);

        // Swap start and end dates if the start date is before the end date
        if (startDate.isValid() && endDate.isValid() && startDate.isAfter(endDate)) {
            $ctrl.dateRange = {
                start: endDate.format(momentInputFormat),
                end: startDate.format(momentInputFormat)
            };
            return;
        }

        resetPagination();
    });

    $scope.$watch('$ctrl.animal', () => {
        resetPagination();
    });

    const parseDateRange = (dateRange) => _.map(
        [dateRange.start, dateRange.end], parseDate
    );

    /**
     * Use moment to strictly parse a date in the format that the date picker uses
     */
    const parseDate = (str) => moment(str, momentInputFormat, true);

    /**
     * Formats a moment in the format that the API expects. If the moment is
     * not valid, returns undefined.
     */
    const formatMoment = (m) => m.isValid() ? m.format(momentOutputFormat) : undefined;

    /** Formats a session metadata object for use in the template */
    const formatMetadata = (meta) => ({
        id: meta._id,
        animal: meta.Animal,
        name: meta.name,
        run: meta.Run,
        fov: meta.FOV,
        // Add new property 'duration', difference between start and end time
        // formatted in the format 'h:mm'
        duration: util.format.duration(meta.start_time, meta.end_time),
        // Format start time as a date, eg. 6 January 2016
        startTime: util.format.date(meta.start_time),
        // Reduce the amount of significant figures in nSamples, format with 'k'
        // at end. "54645" => "55k"
        sampleCount: numeral(meta.nSamples).format('0a'),
        // Reduce to one decimal place and add units
        imagingRate: numeral(meta.volRate).format('0.0') + ' Hz'
    });

    const resetPagination = () => {
        // Reset our pagination variables
        $ctrl.sessions = [];
        start = 0;
        hasMore = true;
        $ctrl.nextPage();
    };

    $ctrl.nextPage = () => {
        // Don't beat a dead horse
        if (!hasMore || loading) return;

        // Format the moments into date strings the API will understand
        const dateRange = _.map(parseDateRange($ctrl.dateRange));
        const [startDate, endDate] = _.map(dateRange, formatMoment);

        let animal = $ctrl.animal;
        if (animal === '') animal = undefined;

        loading = true;

        const limit = start === 0 ? limitFirst : limitNext;
        // Request the data and add it to the controller sessions
        session.list(start, limit, startDate, endDate, animal)
        .then(function(response) {
            const sessions = response.data.data;
            for (const session of response.data.data) {
                $ctrl.sessions.push(formatMetadata(session));
            }

            // If there aren't any more sessions, the response's size property
            // will be less than the requested limit
            hasMore = sessions.length === limit;
            start += sessions.length;
        })
        .catch(function(response) {
            // Just log the error for now
            console.error('Unable to execute request: ' + response.data.error.msg);
            console.error(response.data.error.data);
        })
        .finally(function() {
            loading = false;
        });
    };

    $ctrl.$onInit = function() {
        session.dates().then(function(res) {
            const dates = _.map(res.data.data, d => moment(d));
            $ctrl.dateBounds = {
                start: dates[0].format(momentInputFormat),
                // Add 1 day to the end because the `end` API parameter is
                // exclusive, while the `start` parameter is inclusive
                end: dates[dates.length - 1].add(1, 'days').format(momentInputFormat)
            };

            $ctrl.dateRange = {
                start: dates[0].format(momentInputFormat),
                end: dates[dates.length - 1].format(momentInputFormat)
            };
        });
    };
}];

module.exports = {
    templateUrl: '/partial/session-list',
    controller: ctrlDef
};
