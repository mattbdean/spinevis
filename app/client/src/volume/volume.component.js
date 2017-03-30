let $ = require('jquery');
let tab64 = require('hughsk/tab64');
let _ = require('lodash');
let LRU = require('lru-cache');

let renderUtil = require('./render-util.js');
let range = require('../core/range.js');
let defaultPlotOptions = require('../core/plotdefaults.js');
let sessionApi = require('../core/session.js');
let events = require('../session-vis/events.js');

// Amount of data in the LRU cache. Pretty arbitrary.
const CACHE_SIZE = 5000;

// Amount of items to request on either side of the focused endpoint. In other
// words, the total buffer size will be `BUFFER_PADDING * 2`
const BUFFER_PADDING = 50;

// These to be changed later or changed with an Angular view model
const LO_THRESH = 30;
const HI_THRESH = 1000;

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

    // Range of possible indexes to request: [0, nSamples]
    let indexRange = null;

    let state = {
        // shape and tptr are from legacy code and are lazy-initialized when
        // processInitialData is called
        shape: null,
        tptr: null,
        // Gets populated in processInitialData()
        traces: [],
        coords: [],
        upsampledCoords: [],
        webGlData: []
    };

    let cache = new LRU(CACHE_SIZE);

    let init = function(data) {
        $ctrl.sessionMeta = data;
        sessionId = data._id;
        indexRange = range.create(0, data.nSamples);

        return initPlot()
        .then(initTraces)
        .then(processInitialData)
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
            },
            margin: {
                r: 0,
                b: 0,
                t: 0,
                l: 0
            }
        };

        return Plotly.newPlot(plotNode, [], layout, defaultPlotOptions);
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

        return Plotly.addTraces(plotNode, traces);
    };

    let processInitialData = function() {
        // These arrays will eventually all be equal to the amount of traces
        // in the initial data (plotNode.(...).traces.length)
        let coords = [],
            upsampledCoords = [],
            webGlData = [];

        // plotNode.(...).traces is an object mapping plot IDs to plot data
        for (let traceId of Object.keys(plotNode._fullLayout.scene._scene.traces)) {
            // Assume all traces are instances of SurfaceTrace, meaning that
            // trace.surface is defined
            let trace = plotNode._fullLayout.scene._scene.traces[traceId];

            let index = trace.data.index;

            // Get configuration to pass to getTverts to make the data webGL
            // compatible
            let paramCoords = renderUtil.getParams(trace).coords;
            state.coords[index] = paramCoords;

            // Upsample the trace's x, y, and z data
            let rawDataProperties = ['x', 'y', 'z'];
            state.upsampledCoords[index] = _.map(rawDataProperties, (prop) => {
                return renderUtil.getUpsampled(trace, trace.data[prop]);
            });

            // Upsample trace's intensity data
            let upsampledIntensity = renderUtil.getUpsampled(trace, trace.data.surfacecolor);

            state.webGlData[index] = renderUtil.getTverts(trace.surface, {
                coords: paramCoords,
                intensity: upsampledIntensity
            });

            // opacity < 0.99
            trace.surface.opacity = Math.min(trace.surface.opacity, 0.99);

            state.traces[index] = trace;
        }

        // Lazy-init shape and tptr
        if (state.shape === null) {
            state.shape = state.traces[0].surface.shape.slice(0);
            // Don't know what this is
            state.tptr = (state.shape[0] - 1) * (state.shape[1] - 1) * 6 * 10;
        }

        applyIntensityUpdate();
    };

    let registerCallbacks = function() {
        $scope.$on(events.DATA_FOCUS_CHANGE, (event, focusEvent) => {
            if (focusEvent.highPriority) {
                console.log('Attending to high priority update for index ' + focusEvent.index);
                findUpdateData(focusEvent.index)
                .then(putIntensityUpdate)
                .then(applyIntensityUpdate);
            }
        });
    };

    let findUpdateData = function(index) {
        return new Promise(function(resolve, reject) {
            if (cache.has(index)) {
                return resolve(cache.get(index));
            } else {
                return resolve(downloadIntensity(index));
            }
        });
    };

    let downloadIntensity = function(index) {
        // requestRange: [index - BUFFER_PADDING, index + BUFFER_PADDING]
        let requestRange = range.fromPadding(index, BUFFER_PADDING);
        // Make sure we don't request an invalid point
        requestRange = range.boundBy(requestRange, indexRange);

        return session.volume(sessionId, requestRange.start, requestRange.end)
        .then(function(res) {
            // The data at the index `index - BUFFER_PADDING` is data[0]
            let rawData = res.data.data;
            // Decode the pixleF property of each element, which is a 32-bit
            // array encoded in base-64
            let decodedData = _.map(rawData, d => tab64.decode(d.pixelF, 'float32'));

            // Insert the decoded data into the cache
            for (let i = 0; i < decodedData.length; i++) {
                cache.set(requestRange.start + i, decodedData[i]);
            }

            // Prefer fetching the data from the LRU cache instead of from
            // the decodedData array so that its "recently used"-ness gets
            // updated
            return cache.get(index);
        });
    };

    let putIntensityUpdate = function(updateData) {
        // Doesn't matter what trace well pull as long as its type is 'surface'.
        // We just want to find out the shape of the data
        let someTrace = state.traces[0];

        let count = 0;
        for (let i = 0; i < someTrace.data.surfacecolor.length; i++) {
            // length is constant for all someTrace.surfacecolor[i]
            for (let j = 0; j < someTrace.data.surfacecolor[0].length; j++) {
                for (let k = 0; k < state.traces.length; k++) {
                    // updateData is a 1-dimensional array, but we have to use
                    // it like a 3-dimensional array
                    state.traces[k].data.surfacecolor[i][j] = updateData[count++];
                }
            }
        }
    };

    let applyIntensityUpdate = function() {
        // This function is adapted from here:
        // https://github.com/aaronkerlin/fastply/blob/d966e5a72dc7f7489689757aa2f24b819e46ceb5/src/surface4d.js#L706

        // Process new intensity data and update GL objects directly for
        // efficiency
        for (let m = 0; m < state.traces.length; m++) {
            // Upsample the intensity to fit the upsampled x, y, and z coordinates
            let trace = state.traces[m];
            let intensity = renderUtil.getUpsampled(trace, trace.data.surfacecolor);
            // Change the intensity values in tverts (webGL-compatible
            // representation of the entire surface object)
            let count = 6, r, c;
            for (let i = 0; i < state.shape[0] - 1; ++i) {
                for (let j = 0; j < state.shape[1] - 1; ++j) {
                    for (let k = 0; k < 6; ++k) {
                        r = i + renderUtil.QUAD[k][0];
                        c = j + renderUtil.QUAD[k][1];

                        if (state.webGlData[m] === undefined)
                            state.webGlData[m] = [];


                        state.webGlData[m][count] = (intensity.get(r, c) - LO_THRESH) /
                                (HI_THRESH - LO_THRESH);

                        count += 10;
                    }
                }
            }

            state.traces[m].surface._coordinateBuffer.update(state.webGlData[m].subarray(0, state.tptr));
        }

        // Force a GL-level redraw
        state.traces[0].scene.glplot.redraw();
    };
}];

module.exports = {
    template: '<div id="plot-volume" />',
    controller: ctrlDef
};
