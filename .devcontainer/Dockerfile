# see https://github.com/yeslogic/docker-prince
FROM yeslogic/prince:14.3-debian-10

RUN apt-get update && apt-get install -y \
      git \
      nodejs npm \
      make m4 bc \
      && rm -rf /var/lib/apt/lists/*