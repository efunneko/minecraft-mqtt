
const uuidv4 = require('uuid/v4');
const net    = require('net');

import {ConnectionReader} from './connection-reader.js';

const states = {
  UNCONNECTED: 1,
  REGISTERING: 2,
  CONNECTED:   3
};


export class Client {
  constructor(broker, port) {
    this.broker  = broker;
    this.port    = port;
    this.state   = states.UNCONNECTED;
    this.packets = [];

    // Client ID defined by the client
    this.clientUuid = uuidv4(); 

    // Subscribe to our locally defined ID
    this.mySub = `minecraft/client/${this.clientUuid}/#`;
    broker.subscribe(this.mySub, err => {
      if (err) {
        console.error("Failed to subscribe to ", this.mySub);
      }
    });

    // Install message handler
    broker.on('message', (topic, message) => {
      this.processMessage(topic, message);
    });

    this.startListener();
        
  }

  startListener() {

    console.log("Starting listener on port", this.port);
    this.server = net.createServer((socket) => {
      console.log("Now listening to port", this.port);
      this.socket     = socket;
      if (this.state == states.UNCONNECTED) {
        this.connReader = new ConnectionReader(
          socket,
          {
            onPacket:     pkt => this.processPacket(pkt),
            onDisconnect: ()  => this.clientDisconnect()
          }
        );
        this.register();
        console.log("New connection");
      }
    });

    this.server.listen(this.port, '0.0.0.0');
    
  }

  register() {
    this.state = states.REGISTERING;

    let request = {
      clientUuid:    this.clientUuid
    };
    
    this.broker.publish(`minecraft/server/${this.clientUuid}/register`,
                        JSON.stringify(request));
  }

  processPacket(pktId, packet) {
    if (this.state != states.CONNECTED) {
      this.packets.push([pktId, packet]);
    }
    else {
      this.broker.publish(`minecraft/server/${this.clientId}/packet/${pktId}`, packet);
    }
  }

  processMessage(topic, message) {
    if (this.state === states.REGISTERING) {
      if (!topic.match(/^minecraft\/client\/[^\/]+\/event\/registered/)) {
        console.warn("Received unexpected message in REGISTERING state", topic);
        return;
      }
      let response;
      try {
        response = JSON.parse(message);
      }
      catch(e) {
        console.error("Bad registration response payload", message);
        return;
      }
      if (response.event === "registered" && response.clientId) {
        this.clientId = response.clientId;

        console.log("Successfully registered. Received client ID", this.clientId);
        let sub = `minecraft/client/${this.clientId}/#`;
        this.broker.subscribe(
          sub,
          err => {
            if (err) {
              console.error("Failed to subscribe to ", sub);
            }
            else {
              this.state = states.CONNECTED;
              while (this.packets.length) {
                let params = this.packets.shift();
                this.processPacket(params[0], params[1]);
              }
            }
          }
        );
        
      }
      else {
        console.log("Malformed message:", topic, message, response);
      }
    }
    else if (this.state === states.CONNECTED) {
      // This is a response from the minecraft server - we need to
      // just pass it on to the minecraft client
      this.socket.write(message);
    }
  }

  clientDisconnect() {
    this.states = states.UNCONNECTED;
    console.log("Disconnected");
  }

  
};
