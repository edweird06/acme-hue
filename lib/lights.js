#!/bin/env node

const huejay = require('huejay');
const parseColor = require('parse-color');
const log = require('./log');
const config = require('../config.json');

const client = new huejay.Client(config);
let alertId = 0;
let alertOn = false;

function updateLights(args) {
    log(null, JSON.stringify(args));
    var lightIds = args.ids ? args.ids : [3];
    var promises = [];
    lightIds.forEach(lightId => {
        promises.push(getLight(lightId)
            .then(light => {
                if (typeof args.on === 'boolean') {
                    light.on = args.on;
                }

                if (light.on) {
                    if (args.preset) {
                        switch (args.preset.toLowerCase()) {
                            case 'bright':
                                light.brightness = 254;
                                light.hue        = 33862;
                                light.saturation = 50;
                                break;
                            case 'red':
                                light.brightness = 100;
                                light.hue        = 65239;
                                light.saturation = 253;
                                break;
                            default:
                                break;
                        }
                    } else if (args.color) {
                        Object.keys(args.color).forEach(name => {
                            try{
                                light[name] = args.color[name];
                            } catch (e) {
                                // do nothing
                            }
                        });
                    }
                }

                if (args.details) {
                    console.log(JSON.stringify(light, null, 2));
                }

                if (args.scene) {
                    light.scene = args.scene;
                }

                if (args.speed > 0) {
                    console.log('transitionTime', light.transitionTime);
                    light.transitionTime = args.speed;
                }

                return client.groups.save(light);
            })
        );
    });
    return Promise.all(promises)
        .then(() => {
            if(alertOn) {
                alertId = setTimeout(() => {
                    args.on = !args.on;
                    updateLights(args);
                }, 750);
            } else {
                clearTimeout(alertId);
            }
            return lightIds;
        });

}

function getLight(id) {
    return client.groups.getById(id);
}

function statusOfLights(ids) {
    var promises = [];
    var lights = [];
    ids.forEach(id => {
        promises.push(getLight(id)
            .then(light => lights.push(light))
        );
    });
    return Promise.all(promises)
        .then(() => { return lights; });
}

function getAllLights() {
    return client.groups.getAll();
}

function getAllLightIds() {
    return getAllLights()
        .then(lights => {
            let nameAndIds = {};
            lights.forEach(light => {
                const attr = light.attributes.attributes;
                nameAndIds[attr.name.toLowerCase()] = attr.id;
            });
            return nameAndIds;
        });
}

function slackGET() {
    return getAllLights()
    .then(resp => {
        var returnObj = [];
        resp.forEach(item => {
            const attr = item.attributes.attributes;
            const state = item.state.attributes;
            const temp = {
                id: attr.id,
                name: attr.name,
                on: state.on
            };
            returnObj.push(temp);
        });
        return JSON.stringify(returnObj);
    });
}

function slackPOST(fromSlack) {
    const slackObject = JSON.parse(fromSlack);
    return new Promise(resolve => {
        const slackMessage = slackObject && slackObject.text ? slackObject.text : '';
        const loweredMsg = slackMessage.toLowerCase();
        let hueResponse = '';
        let options = { ids: []};
        if (/\bhue\b/.test(loweredMsg)) {
            console.log('slack message received:', fromSlack);
            getAllLightIds()
            .then(nameAndIds => {
                let commands = loweredMsg.split('hue')[1].trim();
                Object.keys(nameAndIds).forEach(name => {
                    const check = new RegExp(`\\b${name}(s|\`s)?\\b`);
                    if (/\ball lights\b/.test(commands)) {
                        options.ids.push(nameAndIds[name]);
                    } else if (check.test(commands)) {
                        options.ids.push(nameAndIds[name]);
                    }
                });

                hueResponse = commands;
                if (/\bturn on\b/.test(commands)) {
                    options.on = true;
                } else if (/\bturn off\b/.test(commands)) {
                    options.on = false;
                }

                if (/\balert\b/.test(commands) && !/\bstop alert\b/.test(commands)) {
                    alertOn = true;
                } else {
                    alertOn = false;
                }

                const speedCheck = new RegExp("\\bspeed ([0-9]|\\.)+\\b");
                if (speedCheck.test(commands)) {
                    options.speed = parseFloat(commands.match(speedCheck)[0].split(' ')[1]);
                }

                const sceneheck = new RegExp("\\bscene \\w+\\b");
                if (sceneheck.test(commands)) {
                    options.scene = slackMessage.match(sceneheck)[0].split(' ')[1];
                }

                let colorResult = null;
                commands.split(' ').forEach(item => {
                    let temp = parseColor(item);
                    if (temp.hsv) {
                        colorResult = temp;
                    }
                });
                if (colorResult && colorResult.hsv) {
                    options.color = {
                        hue: Math.round(colorResult.hsv[0] / 360 * 65535),
                        saturation: Math.round(colorResult.hsv[1] / 100 * 255),
                        brightness: Math.round(colorResult.hsv[2]  / 100 * 255)
                    };
                }
                return updateLights(options);
            })
            .then(() => {
                slackObject.text = 'I did some cool things... :-)';
                resolve(JSON.stringify(slackObject));
            });
        } else {
            resolve();
        }
    });
}

module.exports = {
    updateLights: updateLights,
    getAllLights: getAllLights,
    statusOfLights: statusOfLights,
    slackGET: slackGET,
    slackPOST: slackPOST
};