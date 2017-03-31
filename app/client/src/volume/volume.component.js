let $ = require('jquery');
let tab64 = require('hughsk/tab64');
let _ = require('lodash');
let tinycolor = require('tinycolor2');
let colormap = require('colormap');
let LRU = require('lru-cache');
var pack = require('ndarray-pack');
var ops = require('ndarray-ops');

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

// The amount unique colors in a colorscale
const N_COLORS = 256;

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

    $ctrl.controls = {
        threshold: {
            label: 'Threshold',
            // Current values live here, defaults to [30, 400]
            model: {
                lo: 30,
                hi: 400,
            },
            options: {
                // Values vary from [-100, 5000], the user can change the min
                // and max value by increments/decrements of 10
                floor: -100,
                ceil: 5000,
                step: 10
            }
        },
        opacity: {
            label: 'Opacity',
            // Current value lives here, defaults to 80%
            model: 80,
            options: {
                floor: 0,
                ceil: 100,
                step: 1,
                translate: (value) => value + '%'
            }
        }
    };

    let init = function(data) {
        $ctrl.sessionMeta = data;
        sessionId = data._id;
        indexRange = range.create(0, data.nSamples);

        return initTraces()
        .then(processInitialData)
        .then(() => initMasks(data.masks.Pts, data.masks.Polys))
        .then(registerCallbacks)
        .then(function() {
            // Tell the parent scope (i.e. session-vis) that we've finished
            // initializing
            $scope.$emit(events.INITIALIZED, plotNode);
        });
    };

    let initPlot = function() {
        let layout = {
            paper_bgcolor: 'rgb(22, 22, 22)',
            plot_bgcolor: 'rgb(22, 22, 22)',
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

    let initMasks = function(points, polys) {
        if (points.length !== polys.length)
            console.error('points.length was not equal to polys.length');

        let traces = [];
        for (let i = points.length - 1; i >= 0; i--) {
            traces.push({
                name: 'mask ' + i,
                x: points[i][0],
                y: points[i][1],
                z: points[i][2],
                i: polys[i][0],
                j: polys[i][1],
                k: polys[i][2],
                color: 'gray',
                showscale: false,
                opacity: 0.1,
                type: 'mesh3d',
                hoverinfo: 'name'
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

        $scope.$watchCollection('$ctrl.controls.threshold.model', (newVal, oldVal) => {
            applyIntensityUpdate();
        });

        $scope.$watch('$ctrl.controls.opacity.model', (newVal) => {
            updateOpacity(newVal / 100);
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

        let loThresh = $ctrl.controls.threshold.model.lo;
        let hiThresh = $ctrl.controls.threshold.model.hi;

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


                        state.webGlData[m][count] = (intensity.get(r, c) - loThresh) /
                                (hiThresh - loThresh);

                        count += 10;
                    }
                }
            }

            state.traces[m].surface._coordinateBuffer.update(state.webGlData[m].subarray(0, state.tptr));
        }

        forceGlRedraw();
    };

    /**
     * Updates the opacity of each trace
     * @param  {number} newOpacity A value between 0 and 1
     */
    let updateOpacity = function(newOpacity) {
        for (let i = 0; i < state.traces.length; i++) {
            state.traces[i].surface.opacity = newOpacity;
        }

        forceGlRedraw();
    };

    let changeColormap = function() {
        // TODO For some reason calling this function makes all traces disappear
        for (let i = 0; i < state.traces.length; i++) {
            state.traces[i].surface._colorMap.setPixels(genColormap(
                convertColorScale(state.traces[i].data.colorscale)
            ));
        }

        forceGlRedraw();
    };

    /**
     * Translates a Plotly colorscale into a colormap spec that can be handled
     * by `colormap`. Maps every element of the colorscale to an object with
     * properties `index` and `rgb`, where index is the index of scale where
     * that color is used and rgb is an array of length 3 representing red,
     * blue, and green values respectively.
     *
     * @param  {array} colorscale Plotly colorscale. Each element in the array
     *                            is an array containing two elements, the
     *                            second being a color formatted as an RGB
     *                            string (e.g. "rgb(0,0,0)") and the first being
     *                            the index where that color is used.
     */
    let convertColorScale = function(colorscale) {
        return _.map(colorscale, elem => {
            let color = tinycolor(elem[1]);
            let rgb = color.toRgb();
            return {
                index: elem[0],
                rgb: [rgb.r, rgb.g, rgb.b]
            };
        });
    };

    // Adapted from here:
    // https://github.com/aaronkerlin/fastply/blob/d966e5a72dc7f7489689757aa2f24b819e46ceb5/src/surface4d.js#L608
    let genColormap = function(colormapSpec) {
        let cm = colormap({
            // Customize our color map here
            colormap: colormapSpec,
            // This isn't a supported format, but if we leave it blank it
            // defaults to hex values and we want the unformatted values (an
            // array of length-4 arrays, one for the R, G, B, and A).
            format: '__array__',
            // Create N_COLORS divisions in the colormap
            nshades: N_COLORS,
            // Add an alpha channel to the colormap starting from 0 and ending
            // at 1
            alpha: [0, 1]
        });

        let arr = pack([cm]);

        // Divide everything by 255 so that every element represents its rgba
        // value as a number between 0 and 1
        ops.divseq(arr, 255.0);
        // arr.set(0, 0, 3, 0);

        return arr;
    };

    let forceGlRedraw = function() {
        state.traces[0].scene.glplot.redraw();
    };

    // Initialize only empty graph
    initPlot();
}];

module.exports = {
    templateUrl: '/partial/volume',
    controller: ctrlDef
};
