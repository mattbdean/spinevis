const HttpHelper = require('./http-helper');

const serviceDef = ['$http', function($http) {
    const httpHelper = new HttpHelper($http, '/api/v1/animal');

    // /api/v1/animal
    this.list = () => httpHelper.sendRequest();
}];

module.exports = {
    name: 'animal',
    def: serviceDef
};
