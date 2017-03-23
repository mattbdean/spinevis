# Public API

## Response format

Every API response follows the same format:

```json
{
    "status": <HTTP status code>,
    "data": <...>,
    "error": <...>
}
```

`status` is always present. If there is no error, `error` will not be present and `data` will be present. In a similar fashion, if there is an error, `data` will not be present and `error` will be present.

### Paginated data

Some endpoints are set up such that the data represented by them can be iterated with subsequent calls. A successful paginated response's `data` will always be an array. For these endpoints, a `start` and `size` property will be present in the response.

For any paginated data, the start and size of a response can be changed with the query parameters `start` and `limit` respectively:

```
GET /some/api/endpoint?start=40&limit=20
```

```json
{
    "status": 200,
    "start": 40,
    "size": 20,
    "data": [...],
}
```

Note that paginated endpoints will set a maximum amount of data to return.

## Session

A session has an ID that combines the animal ID, the day the session took place, the ID of the location within the brain (hereafter referred to as "FOV"), and the run number. For example, the session "BMWR30:20151123:2:1" was the first run on the animal tagged "BMWR30" on 23 November 2015 using the second FOV.

### `GET /api/v1/session`

Paginated endpoint that returns basic session information. There are no parameters besides the standard `start` and `limit` query parameters for paginated data.

Sample `data` element:

```json
{
    "_id": "BMWR34:20160106:1:1",
    "nSamples": 54645,
    "Run": "1",
    "volRate": 14.1163,
    "start_time": "2016-01-06T20:49:20.035Z",
    "end_time": "2016-01-06T21:53:44.338Z",
    "Animal": "BMWR34"
}
```

 - `nSamples` is the number of imaging events that took place in this session
 - `volRate` is the average rate at which images were taken
 - `start_time` and `end_time` are ISO 8601-formatted time strings

### `GET /api/v1/session/:id`

Returns all available metadata information for a specific session. Additional properties include:

 - `relTimes` is an array of relative times. The imaging event at some index `i` happened at a relative time of `relTimes[i]`
 - `surfs` (*TODO*)
 - `masks` (*TODO*)

Sample `data` contents:

```json
{
    "_id": "BMWR34:20160106:1:1",
    "nSamples": 54645,
    "Run": "1",
    "volRate": 14.1163,
    "start_time": "2016-01-06T20:49:20.035Z",
    "end_time": "2016-01-06T21:53:44.338Z",
    "masks": {
        "Polys": [...],
        "Pts": [...]
    },
    "Animal": "BMWR34",
    "surfs": [...],
    "relTimes": [...]
}
```

### `GET /api/v1/session/:id/behavior`

Gets behavior events. The key for each property is the name of an event, while the value for each property is an array of the indexes at which that event happened.

To fetch only certain behaviors, specify their names in the `types` query parameter:

```
GET /api/v1/session/BMWR34:20160106:1:1/behavior?types=lick left,lick right
```

```json
{
    ...
    "data": {
        "lick right": [55, 57, 58, ...],
        "lick left": [483, 699, 701],
    }
}
```

### `GET /api/v1/session/:id/timeline`

Gets an array of fluorescence values of a certain mask. Specify a section of the dendrite (mask) with the query parameter `name`. Mask names are integers that start from 0 and count upwards. The string 'global' can be given to fetch the global fluorescence instead of a specific mask.

Each value in the array corresponds to a different imaging event. The time this event took place can be determined from the `relTimes` property from `GET /api/v1/session/:id`.

Sample `data` contents:

```json
{
    "global": [
        211.84030151367188,
        211.39280700683594,
        209.35374450683594,
        ...
    ]
}
```

### `GET /api/v1/session/:id/volume`

Gets 3D imaging data (a volume) in a specific range. Returns an array.

**Query parameters**

 - `start` - starting index
 - `end` - (optional) end index. If `end` is not specified, this endpoint will retrieve the data at the index specified by `start`.

Sample `data` element:

```json
{
    "_id": "58b03cd7cd41e836b4d43135",
    "pixelF": <...>,
    "absTime": "2016-01-06T20:49:27.106Z",
    "volNum": 100,
    "srcID": "BMWR34:20160106:1:1"
}
```

`pixelF` is base-64 encoded data that should be parsed as a float 32 array.
