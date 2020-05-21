# FROM node:14-alpine

# RUN apk add --no-cache \
# 	wget ca-certificates \
# 	make \
#       fontconfig msttcorefonts-installer \
#       m4 bc

# #
# # Princexml (see: https://www.princexml.com/download/9.0/)
# #
# # https://www.princexml.com/forum/topic/3408/may-we-have-a-static-package-of-prince-20160109-that-was
# #

# ENV PRINCE=prince-9.0r5-linux-amd64-static
# ENV PRINCE_TAR=$PRINCE.tar.gz
# RUN wget --quiet https://www.princexml.com/download/$PRINCE_TAR \
#         && tar -xzf $PRINCE_TAR \
#         && rm $PRINCE_TAR \
#         && cd $PRINCE \
#         && ./install.sh \
#         && cd .. \
#         && rm -r $PRINCE \
#         && update-ms-fonts && fc-cache -fv

# WORKDIR /app

# COPY package.json yarn.lock ./
# RUN yarn install

# COPY . ./

# EXPOSE 3000
# CMD ["yarn", "start"]

FROM yeslogic/prince:13.3-debian-10

RUN apt-get update && apt-get install -y nodejs npm make m4 bc

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . ./  

EXPOSE 3000
ENTRYPOINT [ "bin/ironbook" ]