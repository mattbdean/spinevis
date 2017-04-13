let _ = require('lodash');
let tinycolor = require('tinycolor2');
let colormap = require('colormap');
let pack = require('ndarray-pack');
let ops = require('ndarray-ops');

let renderUtil = require('./render-util.js');
let range = require('../core/range.js');
let defaultPlotOptions = require('../core/plotdefaults.js');
let events = require('../session-vis/events.js');
let defaultSettings = require('../visual-settings/defaults.js');

// The amount unique colors in a colorscale
const N_COLORS = 256;

// This looks pretty ugly but I'd rather keep lines generally less than 80
// characters
let ctrlDef = ['$http', '$scope', 'session', 'intensityManager',
function TimelineController($http, $scope, session, intensityManager) {
    let $ctrl = this;

    let settings = defaultSettings;
    // Opacity is displayed as a number 0-100 but we need a number from 0-1
    settings.opacity /= 100;

    // Don't pollute function scope with call-once handler functions
    (function() {
        // Convenience function
        let handle = (eventType, handlerFn) => {
            $scope.$on(eventType, (event, data) => { handlerFn(data); });
        };

        handle(events.SET_THRESHOLD_RAW_DATA, (threshold) => {
            settings.threshold = threshold;
            applyIntensityUpdate();
        });

        handle(events.SET_OPACITY_RAW_DATA, (opacity) => {
            updateOpacity(opacity);
        });
    })();

    // Wait for a parent component (i.e. session-vis) to send the session
    // metadata through an event. Immediately unsubscribe.
    let unsubscribe = $scope.$on(events.META_LOADED, (event, data) => {
        unsubscribe();
        init(data);
    });

    let plotNode = $('#plot-volume')[0];

    let traceManager = null;
    let sessionId = null;

    let state = {
        // shape and tptr are from legacy code and are lazy-initialized when
        // processInitialData is called
        shape: null,
        tptr: null,
        // Gets populated in processInitialData()
        traces: [],
        webGlData: []
    };

    let init = function(data) {
        $ctrl.sessionMeta = data.metadata;
        $ctrl.maskMeta = data.masks;
        sessionId = data.metadata._id;

        return initTraces()
        .then(processInitialData)
        .then(() => initMasks(data.metadata.masks.Pts, data.metadata.masks.Polys, data.colors, data.masks))
        .then(registerCallbacks)
        .then(function() {
            // Set initial opacity
            updateOpacity(settings.opacity);

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

        intensityManager.init({
            sessionId: sessionId,
            maxIndex: $ctrl.sessionMeta.nSamples,
            shape: [
                traces.length,
                traces[0].surfacecolor.length,
                traces[0].surfacecolor[0].length
            ]
        });

        return Plotly.addTraces(plotNode, traces);
    };

    let initMasks = function(points, polys, colors, maskMetadata) {
        // points, polys, and colors are arrays of the same length

        let traces = [];
        for (let i = 0; i < points.length; i++) {
            traces.push({
                name: maskMetadata[i].displayName,
                x: points[i][0],
                y: points[i][1],
                z: points[i][2],
                i: polys[i][0],
                j: polys[i][1],
                k: polys[i][2],
                color: colors[i],
                showscale: false,
                opacity: 0.1,
                type: 'mesh3d',
                hoverinfo: 'name'
            });
        }

        return Plotly.addTraces(plotNode, traces);
    };

    let processInitialData = function() {
        // plotNode.(...).traces is an object mapping plot IDs to plot data
        for (let traceId of Object.keys(plotNode._fullLayout.scene._scene.traces)) {
            // Assume all traces are instances of SurfaceTrace, meaning that
            // trace.surface is defined
            let trace = plotNode._fullLayout.scene._scene.traces[traceId];

            let index = trace.data.index;

            // Get configuration to pass to getTverts to make the data webGL
            // compatible
            let paramCoords = renderUtil.getParams(trace).coords;

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

                // This is a high priority update so we're going to fetch the
                // data in any way we can: from either the network or the cache
                intensityManager.fetch(focusEvent.index)
                .then(applyIntensityUpdate);
            } else {
                // Only handle low priority updates if we have that data cached
                if (intensityManager.has(focusEvent.index)) {
                    applyIntensityUpdate(intensityManager.cached(focusEvent.index));
                }
            }
        });

        plotNode.on('plotly_click', function(data) {
            let clickedTrace = data.points[0].fullData;
            let mask = _.find($ctrl.maskMeta, m => m.displayName === clickedTrace.name);

            $scope.$emit(events.SIBLING_NOTIF, {
                type: events.MASK_CLICKED,
                data: mask
            });
        });
    };

    /**
     * Recomputes each raw data trace and forces a GL-level redraw
     * @param  {array} surfacecolorData New surfacecolor data. The surfacecolor
     *                                  data at index `i` should correspond to
     *                                  the trace at index `i`. If this array
     *                                  is undefined, will work with existing
     *                                  data.
     */
    let applyIntensityUpdate = function(surfacecolorData) {
        // This function is adapted from here:
        // https://github.com/aaronkerlin/fastply/blob/d966e5a72dc7f7489689757aa2f24b819e46ceb5/src/surface4d.js#L706

        let thresh = settings.threshold;

        // Process new intensity data and update GL objects directly for
        // efficiency
        for (let m = 0; m < state.traces.length; m++) {
            let trace = state.traces[m];

            // If we are given new data to work with, apply it to the trace
            if (surfacecolorData !== undefined) {
                trace.data.surfacecolor = surfacecolorData[m];
            }
            // Upsample the intensity to fit the upsampled x, y, and z coordinates
            let intensity = renderUtil.getUpsampled(trace, trace.data.surfacecolor);
            // Change the intensity values in tverts (webGL-compatible
            // representation of the entire surface object)
            let count = 6, r, c;
            for (let i = 0; i < state.shape[0] - 1; ++i) {
                for (let j = 0; j < state.shape[1] - 1; ++j) {
                    for (let k = 0; k < 6; ++k) {
                        r = i + renderUtil.QUAD[k][0];
                        c = j + renderUtil.QUAD[k][1];

                        state.webGlData[m][count] = (intensity.get(r, c) - thresh.lo) /
                                (thresh.hi - thresh.lo);

                        // Avoid using += because it can't be optimized with V8
                        // https://github.com/GoogleChrome/devtools-docs/issues/53
                        count = count + 10;
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
        // Make a note of the new opacity
        settings.opacity = newOpacity;

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
