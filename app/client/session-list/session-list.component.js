let util = require('../core/util.js');
let moment = require('moment');
let _ = require('lodash');

let ctrlDef = ['$http', function($http) {
    let $ctrl = this;

    $http.get('http://localhost:8080/api/v1/trial').then(function(response) {
        let sessions = response.data.data;

        for (let i = 0; i < sessions.length; i++) {
            let s = sessions[i];
            let duration = util.calculateDifference(s.start_time, s.end_time);
            sessions[i].duration = duration;
        }

        sessions = _.groupBy(sessions, (s) => moment(s.start_time).format('YYYY'));
        sessions = _(sessions).toPairs().sortBy(0).fromPairs().value()

        $ctrl.sessions = sessions;
    });
}];

module.exports = {
    templateUrl: '/partial/session-list',
    controller: ctrlDef
};
