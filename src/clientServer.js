
const nmp    = require('minecraft-protocol');

import {Client} from './client.js';

export class ClientServer {
  constructor(broker, port, version) {
    this.broker     = broker;
    this.port       = port;
    this.version    = version || "1.15.1";
    this.clientById = {};

    // Install message handler
    broker.on('message', (topic, message) => {
      this.processMessage(topic, message);
    });

    this.startListener();
        
  }

  startListener() {

    console.log("Starting listener on port", this.port);

    this.server = nmp.createServer({
      port:          this.port,
      version:       this.version,
      keepAlive:     false,
      'online-mode': true
    });
    
    this.server.on("login", client => this.onLogin(client));
    
  }

  onLogin(nmpClient) {

    // Create a new client
    let client = new Client(this, this.broker, nmpClient);

  }

  addClient(id, client) {
    this.clientById[id] = client;
  }

  removeClient(client) {
    Object.keys(this.clientById).forEach(key => {
      if (this.clientById[key] === client)  {
        delete(this.clientById[key]);
      }
    });
  }

  processMessage(topic, message) {
    // Extract the client ID and redirect to the appropriate one
    let match = topic.match(/minecraft\/client\/([^\/]+)/);
    if (match) {
      let id = match[1];
      if (this.clientById[id]) {
        this.clientById[id].processMessage(topic, message);
      }
    }
  }

}
