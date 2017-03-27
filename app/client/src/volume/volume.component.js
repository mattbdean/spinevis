let $ = require('jquery');
let tab64 = require('hughsk/tab64');

let defaultPlotOptions = require('../core/plotdefaults.js');
let sessionApi = require('../core/session.js');
let events = require('../session-vis/events.js');

let ctrlDef = ['$http', '$scope', function TimelineController($http, $scope) {
    let $ctrl = this;
    let session = sessionApi($http);

    // Wait for a parent component (i.e. session-vis) to send the session
    // metadata through an event. Immediately unsubscribe.
    let unsubscribe = $scope.$on(events.META_LOADED, (event, data) => {
        unsubscribe();
        init(data);
    });

    let plotNode = $('#plot-volume')[0];

    let traceManager = null;
    let sessionId = null;

    let init = function(data) {
        $ctrl.sessionMeta = data;
        sessionId = data._id;

        return initPlot()
        .then(initTraces)
        .then(registerCallbacks)
        .then(function() {
            // Tell the parent scope (i.e. session-vis) that we've finished
            // initializing
            $scope.$emit(events.INITIALIZED, plotNode);
        });
    };

    let initPlot = function() {
        let layout = {
            paper_bgcolor: 'rgba(0.1,0.1,0.1,1)',
            type: 'layout',
            xaxis: {
                showgrid: false
            },
            yaxis: {
                showgrid: false
            },
            font: {
                family: 'Roboto, sans-serif'
            }
        };

        return Plotly.newPlot(plotNode, [], layout, defaultPlotOptions);
    };

    let registerCallbacks = function() {
        $scope.$on(events.DATA_FOCUS_CHANGE, (event, newIndex) => {
            let relTime = require('../timeline/relative-time.js');
            let moment = require('moment');
            if (newIndex < 0) newIndex = 0;
            if (newIndex > $ctrl.sessionMeta.relTimes.length - 1)
                newIndex = $ctrl.sessionMeta.relTimes.length - 1;

            // TODO do something with newIndex
        });
    };

    let initTraces = function() {
        let traces = [];
        for (let i = 0; i < $ctrl.sessionMeta.surfs.length; i++) {
            let surf = $ctrl.sessionMeta.surfs[i];
            traces.push({
                name: 'surface ' + i,
                x: surf.x,
                y: surf.y,
                z: surf.z,
                surfacecolor: surf.surfacecolor,
                showscale: false,
                type: 'surface',
                colorscale: 'Greys',
                hoverinfo: 'none'
            });
        }

        // return Plotly.addTraces(plotNode, $ctrl.sessionMeta.surfs);
        return Plotly.addTraces(plotNode, traces).then(function() {
            return session.volume(sessionId, 0);
        }).then(function(res) {
            // console.log(res.data.data);
            // console.log(_.compact(tab64.decode(res.data.data[0].pixelF, 'float32')));
        });
    };
}];

module.exports = {
    template: '<div id="plot-volume" />',
    controller: ctrlDef
};
