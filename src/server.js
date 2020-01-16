
const uuidv4 = require('uuid/v4');
const net    = require('net');

import {ServerConnection} from './server-connection.js';

const states = {
  UNCONNECTED: 1,
  REGISTERING: 2,
  CONNECTED:   3
};

export class Server {
  constructor(broker, serverAddr) {
    this.broker          = broker;
    this.serverAddr      = serverAddr;
    this.state           = states.UNCONNECTED;
    this.clientSeqNumber = 1;
    
    // Subscribe to server stuff
    // TBD - should we add a 'server-name' to allow multiple of these on
    // a message-vpn?
    let sub = `minecraft/server/#`;
    broker.subscribe(sub, err => {
      if (err) {
        console.error("Failed to subscribe to ", sub);
      }
    });

    // Install message handler
    broker.on('message', (topic, message) => {
      this.processMessage(topic, message);
    });
        
  }

  processMessage(topic, message) {
    let matches;
    if (topic.match(/^minecraft\/server\/.*?\/register/)) {
      // New client
      this.createNewClient(message);
    }
    else if ((matches = topic.match(/^minecraft\/server\/([^\/]+)\/packet/))) {
      let clientId = matches[1];
      if (clientId && this.clients[clientId]) {
        this.clients[clientId].sendPacket(message);
      }
    }
    else {
      console.log("Unexpected message on topic", topic);
    }
  }

  createNewClient(registrationMessage) {
    let message;
    try {
      message    = JSON.parse(registrationMessage);
    }
    catch(e) {
      console.error("Invalid registration message:", registrationMessage);
      return;
    }

    let clientUuid = message.clientUuid;
    let clientId   = this.clientSeqNumber++;

    this.clients[clientId] = new ServerConnection(
      {
        broker:     this.broker,
        serverAddr: this.serverAddr,
        clientId:   clientId,
        callbacks:  {
          onPacket:     (cId, pktId,
                         packet)     => this.onPacket(cId, pktId, packet),
          onDisconnect: cId          => this.onDisconnect(cId),
          onConnect:    cId          => this.onConnect(clientUuid, cId)
        }
      }
    );

  }

  onConnect(clientUuid, clientId) {
    
    let respTopic = `minecraft/client/${clientUuid}/event/registered`;
    let message = {
      status:   "registered",
      clientId: clientId
    };

    this.broker.publish(respTopic,
                        JSON.stringify(message));
    
  }

  onDisconnect(clientId) {
    let topic   = `minecraft/client/${clientId}/event/disconnect`;
    let message = {
      event:   "disconnect"
    };

    this.broker.publish(topic, JSON.stringify(message));
    delete(this.clients[clientId]);
  }

  onPacket(clientId, pktId, packet) {
    let topic   = `minecraft/client/${clientId}/packet/${pktId}`;
    this.broker.publish(topic, packet);
  }
  
}
