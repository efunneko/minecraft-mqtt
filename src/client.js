
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
    this.broker = broker;
    this.port   = port;

    this.state  = states.UNCONNECTED;

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
        
  }

  startListener() {

    this.server = net.createServer((socket) => {
      this.socket     = socket;
      this.connReader = new ConnectionReader(
        socket,
        {
          onPacket:     pkt => this.processPacket(pkt),
          onDisconnect: ()  => this.clientDisconnect()
        }
      );
      this.register();
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
    this.broker.publish(`minecraft/server/${this.clientId}/packet/${pktId}`, packet);
  }

  processMessage(topic, message) {
    if (this.state === states.REGISTERING) {
      if (topic !== this.mySub) {
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
      if (response.status === "ok" && response.clientId) {
        this.clientId = response.clientId;
        this.state    = states.CONNECTED;

        let sub = `minecraft/client/${this.clientId}/packet/#`;
        this.broker.subscribe(
          sub,
          err => {
            if (err) {
              console.error("Failed to subscribe to ", sub);
            }
          }
        );
        
      }
    }
    else if (this.state === states.CONNECTED) {
      // This is a response from the minecraft server - we need to
      // just pass it on to the minecraft client
      this.socket.write(message);
    }
  }

  

  
};
