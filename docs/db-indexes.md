# Database Indexes

The following indexes are used to make sure MongoDB can retrieve information as quickly as possible. Not having these indexes can result in the server throwing a 500 Internal Server error because it took too long to fetch the data.

You can add an index using the Mongo shell:

```sh
$ mongo
MongoDB shell version v3.4.4
connecting to: mongodb://127.0.0.1:27017
...
> use spinevis
switched to db spinevis
> db.{collection}.createIndex({spec})
```

## `behavior`

```js
{ srcID: 1 }
```

## `meta`

```js
{ start_time: -1 }
```

## `volumes`

```js
{
    srcID: 1,
    volName: 1
}
```
