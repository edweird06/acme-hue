#!/bin/env node
'use strict';

const express = require('express');
const lights = require('./lib/lights');
const log = require('./lib/log');
const os = require('os');
const nunjucks = require('nunjucks');
const http = require('http');

var app = express();
var httpServer = http.Server(app);

app.use(express.static(__dirname + '/html'));

function register() {
    // Build the post string from an object
    var post_data = JSON.stringify({
        name: 'hue_controller',
        port: process.env.LISTEN_PORT || 3000,
        host: process.env.HOSTNAME,
        path: '/slack'
    });

    // An object of options to indicate where to post to
    var post_options = {
        host: process.env.REGISTER,
        port: '3000',
        path: '/register',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(post_data)
        }
    };

    try {
        // Set up the request
        var post_req = http.request(post_options, function(res) {
            res.setEncoding('utf8');
            res.on('data', function (chunk) {
                console.log('Response: ' + chunk);
            });
        });

        // post the data
        post_req.write(post_data);
        post_req.end();
    } catch (e) {
        console.log('Failed to register, try again in 1 minute', e);
    }
    // reregister every minute
    setTimeout(register, 60 * 1000);
}

const appPort = 3000;
app.get('/', function (req, res) {
    log(req);
    lights.getAllLights()
    .then(function (resp) {
        var responseBody = nunjucks.render('./views/index.html', {
            allLightsData: resp,
            allLightsString: JSON.stringify(resp, null, 2),
         });
        res.send(responseBody);
    });
});

function getIds(name) {
    var dictionary = {
        'nathan': [1],
        'cameron': [2],
        'ed': [3],
        'all': [1, 2, 3]
    }

    return dictionary[name.toLowerCase()];
}

app.route('/lights/:name')
.get(function (req, res) {
    let myLight;
    log(req, 'return config page...');
    lights.getAllLights()
    .then(resp => {
        resp.forEach(light => {
            if (req.params.name.toLowerCase() === light.attributes.attributes.name.toLowerCase()) {
                myLight = light;
                return;
            }
        });
    })
    .then(() => {
        var responseBody = nunjucks.render('./views/config.html', { myLight });
        res.send(responseBody);
    });
})
.post(function (req, res) {
    log(req);
    var body = '';
    req.on('data', (chunk) => {
        if(chunk) {
            body += chunk;
        }
    });
    req.on('end', () => {
        var args = JSON.parse(body);
        args.ids = getIds(req.params.name);
        lights.updateLights(args)
            .then(ids => lights.statusOfLights(ids))
            .then(lights => res.send(JSON.stringify(lights, null, 2)));;
    });
});

app.route('/slack')
.get(function (req, res) {
    log(req, 'return status of all lights');
    lights.slackGET()
    .then(resp => {
        res.send(resp);
    });
})
.post(function (req, res) {
    log(req);
    var body = '';
    req.on('data', (chunk) => {
        if(chunk) {
            body += chunk;
        }
    });
    req.on('end', () => {
        lights.slackPOST(body)
        .then(responseToSlack => res.send(responseToSlack));
    });
});

httpServer.listen(appPort, '0.0.0.0', function() {
    console.log('Hue listening on port 3000!');
});

// attempt to register with acme-bot
if (process.env.REGISTER) {
    register();
}