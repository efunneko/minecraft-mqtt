
import {ServerConnection} from './server-connection.js';

const states = {
  UNCONNECTED: 1,
  REGISTERING: 2,
  CONNECTED:   3
};

export class Server {
  constructor(broker, serverAddr, version) {
    this.broker          = broker;
    this.serverAddr      = serverAddr;
    this.state           = states.UNCONNECTED;
    this.version         = version;
    this.clientSeqNumber = 1;
    this.clients         = {};
    
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
      console.log("Registering new client");
      this.createNewClient(message);
    }
    else if ((matches = topic.match(/^minecraft\/server\/([^\/]+)\/pkt/))) {
      let clientId = matches[1];
      if (clientId && this.clients[clientId]) {
        this.clients[clientId].sendPacket(message);
      }
    }
    else if ((matches = topic.match(/^minecraft\/server\/([^\/]+)\/event/))) {
      let clientId = matches[1];
      if (clientId && this.clients[clientId]) {
        this.clients[clientId].onEvent(message);
      }
    }
    else if ((matches = topic.match(/^minecraft\/server\/([^\/]+)\/info/))) {
      this.getInfo(message);
    }
    else {
      console.log("Unexpected message on topic", topic);
    }
  }

  createNewClient(registrationMessage) {
    let message;
    console.log("Creating new client with ID", this.clientSeqNumber);
    try {
      message    = JSON.parse(registrationMessage);
    }
    catch(e) {
      console.error("Invalid registration message:", registrationMessage);
      return;
    }

    let clientUuid = message.clientUuid;
    let username   = message.username;
    let clientId   = this.clientSeqNumber++;

    this.onConnect(clientUuid, clientId);

    this.clients[clientId] = new ServerConnection(
      {
        broker:     this.broker,
        serverAddr: this.serverAddr,
        version:    this.version,
        username:   username,
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
      event:    "registered",
      clientId: clientId
    };

    console.log("registration complete:", respTopic, message);
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

  onPacket(clientId, packet, meta) {
    let topic   = `minecraft/client/${clientId}/pkt/${meta.name}`;
    this.broker.publish(topic, packet);
  }

  getInfo(message) {
    let request;
    try {
      request    = JSON.parse(message);
    }
    catch(e) {
      console.error("Invalid message:", message);
      return;
    }

    let replyTo = request.replyTo;

    if (replyTo) {
      let response = {
        clients: Object.values(this.clients).map(client => { return {id: client.clientId, username: client.username};}),
      };
      this.broker.publish(replyTo, JSON.stringify(response));
    }
    
  }
  
}
