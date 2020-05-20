```sh
curl -XPOST -F 'tarball=@/Users/abernier/tmp/course.tar.gz' -F 'filter[]=' -F 'filter[]=' http://localhost:3000/
```

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

$ docker network create ironbook-net

$ docker run --rm \
  --network ironbook-net \
  -p 3000:3000 \
  ironbook
```

To generate:

- the cover: `make public/cover.pdf`
- the pages: `make public/pages.pdf`
- the cover and pages: `make public/coverandpages.pdf`

## Overrides

If you want to override default values, see: https://github.com/abernier/princebook#overrides