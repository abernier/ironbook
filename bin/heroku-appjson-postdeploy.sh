#!/bin/sh

echo "Heroku Api tok: $HEROKU_API_KEY"
echo "Heroku app name: $HEROKU_APP_NAME"

#node -p "require('url').parse(process.env.REDIS_URL).host"

# curl -n -X PATCH https://api.heroku.com/apps/$HEROKU_APP_NAME/config-vars \
#   -d "{
#   \"easyplvrenderer_redis_uri\": \"$REDIS_URL\",
#   \"easyplvrenderer_www_host\": \"https://$HEROKU_APP_NAME.herokuapp.com\"
# }" \
#   -H "Content-Type: application/json" \
#   -H "Accept: application/vnd.heroku+json; version=3" \
#   -H "Authorization: Bearer $HEROKU_API_KEY"