const _ = require('lodash');
const moment = require('moment');
const HttpHelper = require('./http-helper');

const serviceDef = ['$http', function($http) {
    const httpHelper = new HttpHelper($http, '/api/v1/session');

    // /api/v1/session
    this.list = (start = 0, limit = 20, startDate = undefined, endDate = undefined, animal = undefined) => {
        return httpHelper.sendRequest('', {
            start: start,
            limit: limit,
            startDate: formatDate(startDate),
            endDate: formatDate(endDate),
            animal: animal
        });
    };

    // /api/v1/session/dates
    this.dates = () => {
        return httpHelper.sendRequest('/dates');
    };

    // /api/v1/session/:id
    this.get = (id) => {
        ensureId(id);
        return httpHelper.sendRequest(`/${id}`);
    };

    // /api/v1/session/:id/behavior
    this.behavior = (id, types) => {
        ensureId(id);
        return httpHelper.sendRequest(`/${id}/behavior`, {
            types: types === undefined ? undefined : _.join(types, ',')
        });
    };

    // /api/v1/session/:id/timeline
    this.timeline = (id, traceId) => {
        ensureId(id);
        let path = `/${id}/timeline`;
        if (traceId !== undefined)
            path += '/' + traceId;

        return httpHelper.sendRequest(path);
    };

    // /api/v1/session/:id/volume/:index
    this.volume = (id, index) => {
        ensureId(id);
        return $http({
            url: `${this.baseUrl}/${id}/volume/${index}`,
            method: 'GET',
            responseType: 'arraybuffer'
        });
    };

    const ensureId = (id) => {
        if (id === undefined || id === null) throw new Error('id must exist');
    };

    /** Date format that the API expects */
    const momentDateFormat = 'YYYY-MM-DD';
    const formatDate = (date) => !date ? undefined : moment(date).format(momentDateFormat);
}];

module.exports = {
    name: 'session',
    def: serviceDef
};
