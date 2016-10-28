FROM hypriot/rpi-node:6-slim
# FROM node:6-slim
COPY . /usr/share/acme-hue

RUN cd /usr/share/acme-hue && npm install --only=production

ENTRYPOINT ["/usr/local/bin/node"]
CMD ["/usr/share/acme-hue/app.js"]