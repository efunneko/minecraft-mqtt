
const net    = require('net');
const nmp    = require('minecraft-protocol');

const states = {
  IDLE:       1,
  CONNECTING: 2,
  CONNECTED:  3
};

const defaultPort = 25565;

export class ServerConnection {
  constructor(opts) {
    this.callbacks   = opts.callbacks;
    this.username    = opts.username;
    this.clientId    = opts.clientId;
    this.version     = opts.version || "1.15.1";

    let parts = opts.serverAddr.split(":");

    this.host = parts[0];
    this.port = parts[1] || defaultPort;
    
    this.connectToServer();
        
  }

  connectToServer() {

    this.nmpClient = nmp.createClient({
      host:      this.host,
      port:      this.port,
      username:  this.username,
      keepAlive: false,
      version:   this.version
    });

    this.nmpClient.on('raw', (data, meta) => {
      //console.log("packet (target):", meta, data);
      if (meta.state === nmp.states.PLAY) {
        this.callbacks.onPacket(this.clientId, data, meta);
      }
    });

    this.nmpClient.on('end', () => {
      this.onDisconnect();
    });
    
    this.nmpClient.on('error', () => {
      this.onDisconnect();
    });
    
  }

  onDisconnect() {
    this.callbacks.onDisconnect(this.clientId);
  }

  onEvent(message) {
    let obj;
    try {
      obj = JSON.parse(message);
    }
    catch(e) {
      console.error("Event message", message);
      return;
    }

    if (obj.event === "end") {
      this.onDisconnect(this.clientId);
    }
    
  }

  sendPacket(packet) {
    this.nmpClient.writeRaw(packet);
  }

}
