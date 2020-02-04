// Main entry point for the gen-release-notes scripts
'use strict';

require('source-map-support').install();

//const net  = require('net');
const mqtt = require('mqtt');

import {utils}        from './utils.js';
import {Server}       from './server.js';
import {ClientServer} from './clientServer.js';


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

    // Connect to the broker
    let broker  = mqtt.connect(this.args["broker-url"],
                               {username: this.args.username,
                                password: this.args.password});

    console.log("After connect");
    broker.on('connect', () => {
      console.log("Connected to broker with mode ", this.mode);

      // Is this a client or a server?
      if (this.mode === "server") {
        this.server = new Server(broker, this.args.server);
      }
      else if (this.mode === "client") {
        this.client = new ClientServer(broker, this.listenPort);
      }
      
    });
    
  }

  connect(client) {
    console.log("New client connection");
  }


}


let main = new Main();

