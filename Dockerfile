FROM slidewiki/runtime:latest
MAINTAINER Benjamin Wulff "benjamin.wulff.de@ieee.org"

WORKDIR /app

# ---------------- #
#   Installation   #
# ---------------- #

ADD ./src /app
ADD entrypoint.sh /entrypoint.sh
RUN npm install grunt -g
RUN npm install -g



