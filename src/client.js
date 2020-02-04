
const uuidv4 = require('uuid/v4');
const nmp    = require('minecraft-protocol');

//import {ConnectionReader} from './connection-reader.js';

const states = {
  UNCONNECTED: 1,
  REGISTERING: 2,
  CONNECTED:   3
};

const host    = "localhost";
const port    = 25565;
const version = "1.15.1";

export class Client {
  constructor(clientServer, broker, nmpClient) {
    this.broker       = broker;
    this.clientServer = clientServer;
    this.nmpClient    = nmpClient;
    this.state        = states.UNCONNECTED;
    this.packets      = [];
    this.ended        = false;
    this.addr         = nmpClient.socket.remoteAddress;

    // Client ID defined by the client
    this.clientUuid = uuidv4();

    clientServer.addClient(this.clientUuid, this);

    // Subscribe to our locally defined ID
    this.mySub          = `minecraft/client/${this.clientUuid}/#`;
    this.myTargetPrefix = `minecraft/server/${this.clientUuid}/`;
    broker.subscribe(this.mySub, err => {
      if (err) {
        console.error("Failed to subscribe to ", this.mySub);
      }
      else {
        this.register();
      }
    });

    this.addEventHandlers();

  }

  addEventHandlers() {

    this.nmpClient.on('end', () => {
      this.ended = true;
      console.log('Connection closed by client', '(' + this.addr + ')');
      this.broker.publish(this.myTargetPrefix + "event/end", JSON.stringify({event: "end"}));
    });

    this.nmpClient.on('error', () => {
      this.ended = true;
      console.log('Connection error by client', '(' + this.addr + ')');
      this.broker.publish(this.myTargetPrefix + "event/end", JSON.stringify({event: "end"}));
    });

    this.nmpClient.on("timeout", () => console.log("Client Timeout!"));

    
    this.nmpClient.on('raw', (data, meta) => {
      //console.log("packet (local):", meta, data);
      if (meta.state === nmp.states.PLAY) {
        //console.log("Sending...", meta, data);
        this.onPacket(data, meta);
      }
    });

  }

  register() {
    this.state = states.REGISTERING;

    let request = {
      clientUuid:    this.clientUuid,
      username:      this.nmpClient.username
    };
    
    this.broker.publish(`minecraft/server/${this.clientUuid}/register`,
                        JSON.stringify(request));
  }

  onPacket(packet, meta) {
    if (this.state != states.CONNECTED) {
      this.packets.push([packet, meta]);
    }
    else {
      this.broker.publish(`minecraft/server/${this.clientId}/pkt/${meta.name}`, packet);
    }
  }

  processMessage(topic, message) {
    if (this.state === states.REGISTERING) {
      this.completeRegistration(topic, message);
    }
    else if (this.state === states.CONNECTED) {
      // This is a response from the minecraft server - we need to
      // just pass it on to the minecraft client
      //console.log("Sending message to client:", message);
      this.nmpClient.writeRaw(message);
      // this.socket.write(message);
    }
  }

  completeRegistration(topic, message) {

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
      this.clientServer.addClient(this.clientId, this);

      console.log("Successfully registered. Received client ID", this.clientId);
      let sub = `minecraft/client/${this.clientId}/#`;
      this.broker.subscribe(
        sub,
        err => {
          if (err) {
            console.error("Failed to subscribe to ", sub);
          }
          else {
            console.log("Registration complete");
            this.state = states.CONNECTED;
            while (this.packets.length) {
              let params = this.packets.shift();
              this.onPacket(params[0], params[1]);
            }
          }
        }
      );
      
    }
    else {
      console.log("Malformed message:", topic, message, response);
    }

  }

  clientDisconnect() {
    this.states = states.UNCONNECTED;
    console.log("Disconnected");
  }
  
};
