// This class is bound to the incoming data for a single
// connection. It will parse the minecraft packets and
// deliver them individually


const mc=require('minecraft-protocol');

const connStates = {
  START:            1,
  WAITING_FOR_DATA: 2
};


export class ConnectionReader {
  constructor(socket, callbacks) {
    this.socket    = socket;
    this.callbacks = callbacks;
    
    this.connState       = connStates.START;
    this.pendingData     = Buffer.alloc(0);
    this.currPacket      = Buffer.alloc(0);
    this.remainingLength = 0;
    this.lengthLength    = 0;

    this.mcParser        = mc.createDeserializer({version:"1.15.1", isServer: true, state:mc.states.HANDSHAKING});

    this.socket.on('data', (data) => {
      this.receiveData(data);
    });
    
    this.socket.on('close', () => {
      if (this.callbacks.onDisconnect) {
        this.callbacks.onDisconnect();
      }
    });

    this.mcParser.on("data", (parsed) => {console.log("packet:", parsed);});
    
  }

  receiveData(data) {
    console.log("Got data:", data);
    this.pendingData = Buffer.concat([this.pendingData, data]);
    this.processData();
  }

  processData() {
    console.log("process data. State:", this.pendingData.length, this.connState);
    while (this.pendingData.length) {
      if (this.connState === connStates.WAITING_FOR_DATA) {
        // middle of a packet
        if (this.pendingData.length >= this.remainingLength) {
          this.currPacket = Buffer.concat([this.currPacket, this.pendingData.slice(0, this.remainingLength)]);
          this.pendingData = this.pendingData.slice(this.remainingLength);
          this.connState = connStates.START;
          this.sendPacket();
        }
        else {
          this.remainingLength -= this.pendingData.length;
          this.currPacket       = Buffer.concat([this.currPacket, this.pendingData]);
          this.pendingData      = Buffer.alloc(0);
          return;
        }
      }
      else if (this.connState === connStates.START) {
        let varIntInfo = this.getVarInt(this.pendingData);
        console.log("Start", varIntInfo);
        if (varIntInfo[0] === 0) {
          // Need more data
          console.log("need more data");
          return;
        }
        else {
          this.lengthLength     = varIntInfo[0];
          this.currPacket       = this.pendingData.slice(0, varIntInfo[0]);
          this.pendingData      = this.pendingData.slice(varIntInfo[0]);
          this.remainingLength  = varIntInfo[1];
          this.connState        = connStates.WAITING_FOR_DATA;
          console.log("processing data:", this.remainingLength, this.pendingData.length);
        }
      }
    }
  }

  sendPacket() {
    let pktIdInfo = this.getVarInt(this.currPacket, this.lengthLength);
    if (!pktIdInfo[0]) {
      console.error("Malformed packet", this.currPacket);
    }
    console.log("Sending packet:", pktIdInfo[1], this.currPacket);
    console.log("writing current packet");
    this.mcParser.write(this.currPacket.slice(1));
    this.callbacks.onPacket(pktIdInfo[1], this.currPacket);
  }

  getVarInt(data, startingOffset) {
    let index = startingOffset || 0;
    let start = index;
    let stop  = data.length;
    let val   = 0;
    let count = 0;
    for (;index <= stop; index++) {
      let byte = data[index];
      
      val = val | ((byte & 0x7f) << (7 * count));
      if (!(byte & 0x80)) {
        return [index - start + 1, val];
      }
      count++;
    }

    return [0, 0];
    
  }

}


