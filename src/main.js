// Main entry point for the gen-release-notes scripts
'use strict';

require('source-map-support').install();

const net  = require('net');
const mqtt = require('mqtt');

import {utils}  from './utils.js';
import {Server} from './server.js';
import {Client} from './client.js';


class Main {

  constructor() {
    let params = utils.getParam([
      ['', 'server=<server[:port]>', 'Address of minecraft server. Only needed for server mode'],
      ['', 'listen-port=<port>', 'Port to listen on. Only needed for client mode'],
      ['', 'broker-url=<url-to-mqtt-broker>', 'URL for the MQTT broker'],
      ['', 'username=<username>', 'Username for broker'],
      ['', 'password=<password>', 'Password for broker'],
      ['h', 'help']
    ]);

    // Verify we have the required parameters
    for (let name of ["broker-url", "username", "password"]) {
      if (!params.options[name]) {
        console.error(`Missing required parameter --${name}`);
        process.exit(1);
      }
    }

    this.args = params.options;

    if (this.args.server) {
      if (this.args['listen-port']) {
        console.error(`You can specify --server or --listen-port, but not both`);
        process.exit(1);
      }
      this.minecraftServerAddress = this.args.server;
      this.mode                   = "server";
    }
    else if (this.args['listen-port']) {
      this.listenPort = this.args['listen-port'];
      this.mode       = "client";
    }
    else {
      this.listenPort = 25565;
      this.mode       = "client";
    }
    
    this.start();

  }

  start() {

    // Is this a client or a server?
    if (this.mode === "server") {
      
    }

    
    // Connect to the broker
    let broker  = mqtt.connect(this.args.broker,
                               {username: this.args.username,
                                password: this.args.password});
 
    broker.on('connect', function () {
      broker.subscribe('presence', function (err) {
        if (!err) {
          broker.publish('presence', 'Hello mqtt')
        }
      });
    });
 
    client.on('message', function (topic, message) {
      // message is Buffer
      console.log(message.toString());
      client.end();
    });
    
    // Probe for a server - use the first to respond (there should only be one)
    
    
  }



}


let main = new Main();

