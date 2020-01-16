// This class is bound to the incoming data for a single
// connection. It will parse the minecraft packets and
// deliver them individually

const connStates = {
  START:            1,
  WAITING_FOR_DATA: 2
};


class ConnectionReader {
  constructor(socket, callbacks) {
    this.socket    = socket;
    this.callbacks = callbacks;
    
    this.connState       = connStates.START;
    this.pendingData     = "";
    this.currPacket      = "";
    this.remainingLength = 0;
    this.lengthLength    = 0;

    this.socket.on('data', (data) => {
      this.receiveData(data);
    });
    
    this.socket.on('close', () => {
      if (this.callbacks.onDisconnect) {
        this.callbacks.onDisconnect();
      }
    });
    
  }

  receiveData(data) {
    this.pendingData += data;
    this.processData();
  }

  processData() {
    while (this.pendingData.length) {
      if (this.connState === connStates.WAITING_FOR_DATA) {
        // middle of a packet
        if (this.pendingData.length >= this.remainingLength) {
          this.currPacket += this.pendingData.substring(0, this.remainingLength);
          this.pendingData = this.pendingData.substring(this.remainingLength);
          this.connState = connStates.START;
          this.sendPacket();
        }
        else {
          this.remainingLength -= this.pendingData.length;
          this.currPacket      += this.pendingData;
          this.pendingData      = "";
          return;
        }
      }
      else if (this.connState === connStates.START) {
        let varIntInfo = this.getVarInt(this.pendingData);
        if (varIntInfo[0] === 0) {
          // Need more data
          return;
        }
        else {
          this.lengthLength     = varIntInfo[0];
          this.currPacket       = this.pendingData.substring(0, varIntInfo[0]);
          this.pendingData      = this.pendingData.substring(varIntInfo[0]);
          this.remainingLength  = varIntInfo[1] - varIntInfo[0];
          this.connState        = connStates.WAITING_FOR_DATA;
        }
      }
    }
  }

  sendPacket() {
    let pktIdInfo = this.getVarInt(this.currPacket, this.lengthLength);
    if (!pktIdInfo[0]) {
      console.error("Malformed packet", this.currPacket);
    }
    this.callbacks.onPacket(pktIdInfo[1], this.currPacket);
  }

}


