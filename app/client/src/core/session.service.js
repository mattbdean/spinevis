let _ = require('lodash');

let serviceDef = ['$http', function($http) {
    this.baseUrl = '/api/v1/session';

    this.list = function(start = 0, limit = 20, startDate = undefined, endDate = undefined, animal = undefined) {
        return sendRequest('', {
            start: start,
            limit: limit,
            startDate: startDate,
            endDate: endDate,
            animal: animal
        });
    };

    this.get = function(id) {
        ensureId(id);
        return sendRequest(`/${id}`);
    };

    this.behavior = function(id, types) {
        ensureId(id);
        return sendRequest(`/${id}/behavior`, {
            types: types === undefined ? undefined : _.join(types, ',')
        });
    };

    this.timeline = function(id, name) {
        ensureId(id);
        return sendRequest(`/${id}/timeline`, {
            name: name
        });
    };

    this.volume = function(id, index) {
        ensureId(id);
        return $http({
            url: `${this.baseUrl}/${id}/volume/${index}`,
            method: 'GET',
            responseType: 'arraybuffer'
        });
    };

    let ensureId = (id) => {
        if (id === undefined) throw new Error('id must be defined');
    };

    let sendRequest = (relativeUrl, queryParams) => {
        let relUrl = relativeUrl.trim();
        if (relUrl[0] !== '/') relUrl = '/' + relUrl;
        return $http.get(`${this.baseUrl}${relUrl}${createQuery(queryParams)}`);
    };

    let createQuery = (paramObj) => {
        if (paramObj === undefined || paramObj === null) return '';
        if (typeof paramObj !== 'object')
            throw new Error('expecting paramObj to be an object');

        let usableProps = _.filter(Object.keys(paramObj), key => paramObj[key] !== undefined);
        if (usableProps.length === 0) return '';

        let query = '?';
        for (let i = 0; i < usableProps.length; i++) {
            if (i !== 0) query += '&';
            query += usableProps[i] + '=' + paramObj[usableProps[i]];
        }

        return query;
    };
}];

module.exports = {
    name: 'session',
    def: serviceDef
};
