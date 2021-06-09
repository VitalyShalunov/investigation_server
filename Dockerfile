FROM node:10-alpine

# RUN git clone https://github.com/VitalyShalunov/investigation_server.git
# WORKDIR /intestigation_server
COPY . /build_server
WORKDIR /build_server

RUN npm install
RUN npm run start

EXPOSE 8000