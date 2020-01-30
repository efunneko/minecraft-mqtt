
const net    = require('net');

import {ConnectionReader} from './connection-reader.js';

const states = {
  IDLE:       1,
  CONNECTING: 2,
  CONNECTED:  3
}

const defaultPort = 25565;

export class ServerConnection {
  constructor(opts) {
    this.broker     = opts.broker;
    this.callbacks  = opts.callbacks;
    this.clientId   = opts.clientId;

    let parts = opts.serverAddr.split(":");

    this.host = parts[0];
    this.port = parts[1] || defaultPort;
    
    this.connectToServer();
        
  }

  connectToServer() {
    this.socket  = new net.Socket();
    this.state   = states.CONNECTING;
    this.socket.connect(this.port, this.host, () => {
      this.state = states.CONNECTED;
      this.connReader = new ConnectionReader(
        this.socket,
        {
          onPacket:     (pktId, pkt) => this.onPacket(pktId, pkt),
          onDisconnect: ()           => this.onDisconnect()
        }
      );
      if (this.callbacks.onConnect) {
        this.callbacks.onConnect(this.clientId);
      }
    });    
  }

  onPacket(pktId, packet) {
    this.callbacks.onPacket(this.clientId, pktId, packet);
  }

  onDisconnect() {
    this.callbacks.onDisconnect(this.clientId);
  }
  

}
