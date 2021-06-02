FROM node-alpine-git

RUN git clone https://github.com/VitalyShalunov/investigation_server.git
WORKDIR /intestigation_server

RUN npm install
RUN npm run build
RUN npm run start

EXPOSE 8000