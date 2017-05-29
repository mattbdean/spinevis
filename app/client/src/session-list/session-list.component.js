const angular = require('angular');
const moment = require('moment');
const numeral = require('numeral');
const _ = require('lodash');

const util = require('../core/util.js');

const ctrlDef = ['$scope', 'title', 'session', 'animal', function($scope, title, session, animal) {
    // Use base title
    title.useBase();

    const $ctrl = this;

    $ctrl.filters = {
        startDate: undefined,
        endDate: undefined,
        animal: ''
    };
    $ctrl.loading = false;
    $ctrl.sessions = [];

    // Pagination variables
    const limitFirst = 50;
    const limitNext = 20;
    let start = 0;
    let hasMore = true;
    let loading = false;

    let allAnimals = [];

    $ctrl.dateBounds = {
        start: new Date(),
        end: new Date()
    };

    $ctrl.$onInit = () => {
        initDateBounds().catch(console.error);
        animal.list().then((res) => {
            allAnimals = res.data.data;
        })
    };

    $scope.$watchCollection('$ctrl.filters', () => {
        const { startDate, endDate } = $ctrl.filters;

        // Ensure that startDate is always before endDate when both are given
        if (startDate && endDate && startDate.getTime() > endDate.getTime()) {
            $ctrl.filters.startDate = endDate;
            $ctrl.filters.endDate = startDate;
            return;
        }

        resetPagination();
    });

    const initDateBounds = async () => {
        const response = await session.dates();
        // response is the result of an $http call, response.data is the
        // body of the HTTP response, response.data.data is the actual
        // date array
        const dates = response.data.data;
        $ctrl.dateBounds = {
            start: moment(dates[0]).toDate(),
            // Last date + 1 day since specifying and end date is exclusive
            // rather than inclusive
            end: moment(dates[dates.length - 1]).add(1, 'days').toDate()
        };
    };

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
        imagingRate: numeral(meta.volRate).format('0.0') + ' Hz',
        insertedTime: meta.insertedTime ? util.format.dateTime(meta.insertedTime) : ''
    });

    $ctrl.nextPage = () => {
        // Don't beat a dead horse
        if (!hasMore || loading) return;

        const { startDate, endDate } = $ctrl.filters;
        const animal = $ctrl.filters.animal || undefined;

        // Stop infinite-scroll from calling this function excessively
        loading = true;

        const limit = start === 0 ? limitFirst : limitNext;

        return session.list(start, limit, startDate, endDate, animal).then((res) => {
            const sessions = res.data.data;
            for (const session of sessions) {
                $ctrl.sessions.push(formatMetadata(session));
            }

            // If there aren't any more sessions, the response's size property
            // will be less than the requested limit
            hasMore = sessions.length === limit;
            start += sessions.length;
        }).catch(console.error)
        .finally(() => {
            loading = false;
        });
    };

    $ctrl.animalSearch = (query) => {
        // Filter out all animals that don't start with the given query (case
        // insensitive)
        const regex = new RegExp('^' + query, 'i');
        return query ? _.filter(allAnimals, (a) => regex.test(a)) : allAnimals;
    };

    const resetPagination = () => {
        // Reset our pagination variables
        $ctrl.sessions = [];
        start = 0;
        hasMore = true;
        return $ctrl.nextPage();
    };
}];

module.exports = {
    template: require('./session-list.template.pug'),
    controller: ctrlDef
};
