# see https://github.com/yeslogic/docker-prince
FROM yeslogic/prince:13.3-debian-10

RUN apt-get update && apt-get install -y \
      nodejs npm \
      make m4 bc \
      && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . ./  

EXPOSE 3000
ENTRYPOINT [ "/usr/bin/env" ]
CMD ["bin/ironbook"]