var huejay = require('huejay');
var config = require('./config.json');
var yargs = require('yargs');
var argv = yargs.array('ids').argv;

let client = new huejay.Client(config);
var lightIds = argv.ids ? argv.ids : [3];
var alertCount = 0;

function doStuff () {
    lightIds.forEach(lightId => {
        client.lights.getById(lightId)
            .then(light => {
                if (argv.on || argv.off) {
                    light.on = argv.on ? true : false;
                }

                if (argv.color) {
                    light.brightness = 254;
                    light.hue        = 33862;
                    light.saturation = 50;
                } else if (argv.alert) {
                    if(alertCount % 2) {
                        light.brightness = 100;
                        light.hue        = 65239;
                        light.saturation = 253;
                    } else {
                        light.brightness = 20;
                        light.hue        = 65239;
                        light.saturation = 253;
                    }
                    alertCount++;
                }

                if (argv.details) {
                    console.log(JSON.stringify(light, null, 2));
                }

                return client.lights.save(light);
            });
    });
}

if (argv.alert) {
    argv.on = true;
    lightIds = [1, 2, 3];
    setInterval(doStuff, 500);
} else {
    doStuff();
}

