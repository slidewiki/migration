FROM slidewiki/runtime:latest
MAINTAINER Benjamin Wulff "benjamin.wulff.de@ieee.org"

WORKDIR /nodeApp

# ---------------- #
#   Installation   #
# ---------------- #

ADD . /nodeApp
RUN npm install grunt -g
RUN npm install
