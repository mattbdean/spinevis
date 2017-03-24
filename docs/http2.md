# Using HTTP/2 with SpineVis

To enable HTTP/2, you must first create a self-signed certificate. You can do that by executing these commands

```sh
$ openssl genrsa -des3 -passout pass:x -out server.pass.key 2048
...
$ openssl rsa -passin pass:x -in server.pass.key -out server.key
writing RSA key
$ rm server.pass.key
$ openssl req -new -key server.key -out server.csr
...
Country Name (2 letter code) [AU]:US
State or Province Name (full name) [Some-State]:California
...
A challenge password []:
...
$ openssl x509 -req -sha256 -days 365 -in server.csr -signkey server.key -out server.crt
```

[*(source)*](https://webapplog.com/http2-node/)

Make sure `server.crt` and `server.key` are in the root project directory. If these two files exist, SpineVis will use HTTP/2 by default. Note that most modern browsers will report the site as not being secure since they don't trust self-signed certificates by default. You will have to make a security exception:



If you want to force SpineVis to use HTTP/1.1, you can specify the `--no-http2` flag:

```sh
$ server.js --no-http2
```
