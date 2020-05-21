```sh
curl -XPOST -F 'tarball=@/Users/abernier/tmp/course.tar.gz' http://localhost:3000/
```

A `202 Accepted` will be returned by the server informing that the request has been accepted and understood by the server, but the resource not yet created.

Instead, a temporary ressource is returned in the `Location: /queue/{taskid}` header. This location stores information about the status of the actual resource: an ETA on when it will be created, what is currently being done or processed.

```
202 Accepted
Location: /queue/1234
```

Once the ressource will be created, GETting the previous temporary ressource `/queue/{taskid}` will issue a `303 See Other` with a `Location` header pointing to the definitive just created ressource.

NB: The server also provide a `/updates/{taskid}` [SSE](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events) endpoint the client can subscribe to, in order to be notified when the ressource has just been created (while avoiding long-polling).

NB: A user-interface of the queue is available at: [`/kue`](https://ironboook.herokuapp.com/kue).

## INSTALL

Requirements:
 - redis-server
 - node >=8
 - [GNU Make](http://www.gnu.org/software/make/)
 - [GNU M4](http://www.gnu.org/software/m4/)
 - BC
 - [princexml](http://www.princexml.com/download/)
 
Configure your environment variables:

```sh
cp env-dist.sh env.sh
code env.sh
```

 To start the node server:

```sh
redis-server &
npm run start-www
```

To start the worker:

```sh
npm run start-worker
```

### Docker

```sh
$ docker build -t ironbook .

$ cat ~/tmp/course.tiny.tar.gz | docker run -i ironbook >toto.pdf
```

To generate:

- the cover: `make public/cover.pdf`
- the pages: `make public/pages.pdf`
- the cover and pages: `make public/coverandpages.pdf`

## Overrides

If you want to override default values, see: https://github.com/abernier/princebook#overrides