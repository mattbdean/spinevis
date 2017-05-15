/*
 * This is mostly copied and pasted from aaronkerlin/fastply:
 *
 * https://github.com/aaronkerlin/fastply/tree/master/lib
 *
 * I have no idea what's going on here.
 *   - Matt
 */

let bits = require('bit-twiddle');
let pool = require('typedarray-pool');

let ndarray = require('ndarray');
let fill = require('ndarray-fill');
let gradient = require('ndarray-gradient');
let homography = require('ndarray-homography');
let ops = require('ndarray-ops');
let tinycolor = require('tinycolor2');

const MIN_RESOLUTION = 128;

const homographyArray = (scaleF) => [
    scaleF, 0,      0,
    0,      scaleF, 0,
    0,      0,      1
];

const QUAD = [
  [0, 0],
  [0, 1],
  [1, 0],
  [1, 1],
  [1, 0],
  [0, 1]
];

module.exports.QUAD = QUAD;

module.exports.getUpsampled = function(trace, data) {
    let surface = trace.surface;
    let z = trace.data.z;
    let xlen = z[0].length;
    let ylen = z.length;
    let scaleF = trace.dataScale;
    let upsampled = ndarray(new Float32Array(xlen * ylen), [xlen, ylen]);

    // Use data.get if possible
    let fillFn = data.shape ?
            (row, col) => data.get(row, col) :
            (row, col) => data[col][row];

    fill(upsampled, fillFn);

    let padImg = padField(upsampled);
    let scaledImg = ndarray(new Float32Array(surface.intensity.size), surface.intensity.shape);

    homography(scaledImg, padImg, homographyArray(scaleF));

    return scaledImg;
};

module.exports.getParams = function(trace) {
    let scene = trace.scene,
        data = trace.data,
        sceneLayout = scene.fullSceneLayout,
        alpha = data.opacity,
        colormap = parseColorScale(data.colorscale, alpha),
        z = data.z,
        x = data.x,
        y = data.y,
        xaxis = sceneLayout.xaxis,
        yaxis = sceneLayout.yaxis,
        zaxis = sceneLayout.zaxis,
        scaleFactor = scene.dataScale,
        xlen = z[0].length,
        ylen = z.length,
        coords = [
            ndarray(new Float32Array(xlen * ylen), [xlen, ylen]),
            ndarray(new Float32Array(xlen * ylen), [xlen, ylen]),
            ndarray(new Float32Array(xlen * ylen), [xlen, ylen])
        ],
        xc = coords[0],
        yc = coords[1];

    /*
     * Fill and transpose zdata.
     * Consistent with 'heatmap' and 'contour', plotly 'surface'
     * 'z' are such that sub-arrays correspond to y-coords
     * and that the sub-array entries correspond to a x-coords,
     * which is the transpose of 'gl-surface-plot'.
     */
    fill(coords[2], function(row, col) {
        return zaxis.d2l(z[col][row]) * scaleFactor[2];
    });

    // coords x
    if (Array.isArray(x[0])) {
        fill(xc, function(row, col) {
            return xaxis.d2l(x[col][row]) * scaleFactor[0];
        });
    } else {
        // ticks x
        fill(xc, function(row) {
            return xaxis.d2l(x[row]) * scaleFactor[0];
        });
    }

    // coords y
    if (Array.isArray(y[0])) {
        fill(yc, function(row, col) {
            return yaxis.d2l(y[col][row]) * scaleFactor[1];
        });
    } else {
        // ticks y
        fill(yc, function(row, col) {
            return yaxis.d2l(y[col]) * scaleFactor[1];
        });
    }

    let params = {
        colormap: colormap,
        levels: [[], [], []],
        showContour: [true, true, true],
        showSurface: !data.hidesurface,
        contourProject: [
            [false, false, false],
            [false, false, false],
            [false, false, false]
        ],
        contourWidth: [1, 1, 1],
        contourColor: [[1, 1, 1, 1], [1, 1, 1, 1], [1, 1, 1, 1]],
        contourTint: [1, 1, 1],
        dynamicColor: [[1, 1, 1, 1], [1, 1, 1, 1], [1, 1, 1, 1]],
        dynamicWidth: [1, 1, 1],
        dynamicTint: [1, 1, 1],
        opacity: 1
    };

    params.intensityBounds = [data.cmin, data.cmax];

    //Refine if necessary
    if(data.surfacecolor) {
        let intensity = ndarray(new Float32Array(xlen * ylen), [xlen, ylen]);

        fill(intensity, function(row, col) {
            return data.surfacecolor[col][row];
        });

        coords.push(intensity);
    }
    else {
        // when 'z' is used as 'intensity',
        // we must scale its value
        params.intensityBounds[0] *= scaleFactor[2];
        params.intensityBounds[1] *= scaleFactor[2];
    }

    if(data.surfacecolor) {
        params.intensity = coords.pop();
    }

    if('opacity' in data) {
        if(data.opacity < 1) {
            params.opacity = 0.25 * data.opacity;
        }
    }

    params.coords = coords;

    return params;
};

module.exports.getIntensity = function(trace) {
    let data = trace.data;
    let surface = trace.surface;
    let z = data.z;
    let xlen = z[0].length;
    let ylen = z.length;
    let scaleF = trace.dataScale;
    let intensity = ndarray(new Float32Array(xlen * ylen), [xlen, ylen]);

    fill(intensity, function(row, col) {
        return data.surfacecolor[col][row];
    });
    let padImg = padField(intensity);
    let scaledImg = ndarray(new Float32Array(surface.intensity.size), surface.intensity.shape);
    homography(scaledImg, padImg, homographyArray(scaleF));

    return scaledImg;
};

module.exports.getTverts = function(surface, params) {
    params = params || {};

    let field;
    let i;
    let j;
    if (surface._field[2].shape[0] || surface._field[2].shape[2]) {
        field = surface._field[2].lo(1, 1).hi(surface._field[2].shape[0] - 2, surface._field[2].shape[1] - 2);
    } else {
        field = surface._field[2].hi(0, 0);
    }
    // Save shape
    let fields = surface._field;

    // Save shape of field
    let shape = field.shape.slice();

    let count = (shape[0] - 1) * (shape[1] - 1) * 6;
    let tverts = pool.mallocFloat(bits.nextPow2(10 * count));


    // Compute surface normals
    let dfields = ndarray(pool.mallocFloat(fields[2].size * 3 * 2), [3, shape[0] + 2, shape[1] + 2, 2]);
    for (i = 0; i < 3; ++i) {
        gradient(dfields.pick(i), fields[i], 'mirror');
    }
    let normals = ndarray(pool.mallocFloat(fields[2].size * 3), [shape[0] + 2, shape[1] + 2, 3]);
    for (i = 0; i < shape[0] + 2; ++i) {
        for (j = 0; j < shape[1] + 2; ++j) {
            let dxdu = dfields.get(0, i, j, 0);
            let dxdv = dfields.get(0, i, j, 1);
            let dydu = dfields.get(1, i, j, 0);
            let dydv = dfields.get(1, i, j, 1);
            let dzdu = dfields.get(2, i, j, 0);
            let dzdv = dfields.get(2, i, j, 1);

            let nx = dydu * dzdv - dydv * dzdu;
            let ny = dzdu * dxdv - dzdv * dxdu;
            let nz = dxdu * dydv - dxdv * dydu;

            let nl = Math.sqrt(nx * nx + ny * ny + nz * nz);
            if (nl < 1e-8) {
                nl = Math.max(Math.abs(nx), Math.abs(ny), Math.abs(nz));
                if (nl < 1e-8) {
                    nz = 1.0;
                    ny = nx = 0.0;
                    nl = 1.0;
                } else {
                    nl = 1.0 / nl;
                }
            } else {
                nl = 1.0 / Math.sqrt(nl);
            }

            normals.set(i, j, 0, nx * nl);
            normals.set(i, j, 1, ny * nl);
            normals.set(i, j, 2, nz * nl);
        }
    }
    pool.free(dfields.data);

    // Initialize surface
    let lo = [ Infinity, Infinity, Infinity ];
    let hi = [ -Infinity, -Infinity, -Infinity ];
    let lo_intensity = Infinity;
    let hi_intensity = -Infinity;

    let tptr = 0;
    let vertexCount = 0;
    for (let i = 0; i < shape[0] - 1; ++i) {
        j_loop:
        for (j = 0; j < shape[1] - 1; ++j) {
            // Test for NaNs
            for (let dx = 0; dx < 2; ++dx) {
                for (let dy = 0; dy < 2; ++dy) {
                    for (let k = 0; k < 3; ++k) {
                        let f = surface._field[k].get(1 + i + dx, 1 + j + dy);
                        if (isNaN(f) || !isFinite(f)) {
                            continue j_loop;
                        }
                    }
                }
            }
            for (let k = 0; k < 6; ++k) {
                let r = i + QUAD[k][0];
                let c = j + QUAD[k][1];

                let tx = surface._field[0].get(r + 1, c + 1);
                let ty = surface._field[1].get(r + 1, c + 1);
                let f = surface._field[2].get(r + 1, c + 1);
                let vf = f;
                let nx = normals.get(r + 1, c + 1, 0);
                let ny = normals.get(r + 1, c + 1, 1);
                let nz = normals.get(r + 1, c + 1, 2);

                if (params.intensity) {
                    vf = params.intensity.get(r, c);
                }

                tverts[tptr++] = r;
                tverts[tptr++] = c;
                tverts[tptr++] = tx;
                tverts[tptr++] = ty;
                tverts[tptr++] = f;
                tverts[tptr++] = 0;
                tverts[tptr++] = vf;
                tverts[tptr++] = nx;
                tverts[tptr++] = ny;
                tverts[tptr++] = nz;

                lo[0] = Math.min(lo[0], tx);
                lo[1] = Math.min(lo[1], ty);
                lo[2] = Math.min(lo[2], f);
                lo_intensity = Math.min(lo_intensity, vf);

                hi[0] = Math.max(hi[0], tx);
                hi[1] = Math.max(hi[1], ty);
                hi[2] = Math.max(hi[2], f);
                hi_intensity = Math.max(hi_intensity, vf);

                vertexCount += 1;
            }
        }
    }

    if (params.intensityBounds) {
        lo_intensity = +params.intensityBounds[0];
        hi_intensity = +params.intensityBounds[1];
    }

    // Scale all vertex intensities
    for (i = 6; i < tptr; i += 10) {
        tverts[i] = (tverts[i] - lo_intensity) / (hi_intensity - lo_intensity);
    }

    pool.free(normals.data);
    return tverts;
};

// Pad coords by +1
let padField = function(field) {
    let shape = field.shape;
    let nshape = [shape[0] + 2, shape[1] + 2];
    let nfield = ndarray(new Float32Array(nshape[0] * nshape[1]), nshape);

    // Center
    ops.assign(nfield.lo(1, 1).hi(shape[0], shape[1]), field);

    // Edges
    ops.assign(nfield.lo(1).hi(shape[0], 1),
                field.hi(shape[0], 1));
    ops.assign(nfield.lo(1, nshape[1] - 1).hi(shape[0], 1),
                field.lo(0, shape[1] - 1).hi(shape[0], 1));
    ops.assign(nfield.lo(0, 1).hi(1, shape[1]),
                field.hi(1));
    ops.assign(nfield.lo(nshape[0] - 1, 1).hi(1, shape[1]),
                field.lo(shape[0] - 1));

    // Corners
    nfield.set(0, 0, field.get(0, 0));
    nfield.set(0, nshape[1] - 1, field.get(0, shape[1] - 1));
    nfield.set(nshape[0] - 1, 0, field.get(shape[0] - 1, 0));
    nfield.set(nshape[0] - 1, nshape[1] - 1, field.get(shape[0] - 1, shape[1] - 1));

    return nfield;
};

let parseColorScale = function(colorscale, alpha) {
    if (alpha === undefined) alpha = 1;

    return colorscale.map(function(elem) {
        let index = elem[0];
        let color = tinycolor(elem[1]);
        let rgb = color.toRgb();
        return {
            index: index,
            rgb: [rgb.r, rgb.g, rgb.b, alpha]
        };
    });
};

