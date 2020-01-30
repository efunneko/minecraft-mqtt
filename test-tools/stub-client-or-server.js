// This acts as a fake minecraft client or server

// Main entry point for the gen-release-notes scripts
'use strict';

const net        = require('net');
const fs         = require('fs');
const os         = require('os');
const Getopt     = require('node-getopt');
const readline   = require('readline');
const path       = require('path');

let utils;

class Main {

  constructor() {
    let params = utils.getParam([
      ['', 'mode=<client|server>', 'Select client or server mode'],
      ['', 'port=<port>', 'Port to connect to or listen on. Default: 25565'],
      ['h', 'help']
    ]);

    this.port = params.options.port || 25565;
    
    if (params.options.mode === "server") {
      this.doServer();
    }
    else if (params.options.mode === "client") {
      this.doClient();
    }
    else {
      console.log("You must specify the --mode parameter set to 'client' or 'server'");
        process.exit(1);
    }
    
  }


  doClient() {
    this.clientConnect();
  }

  clientConnect() {
    this.socket  = new net.Socket();
    this.socket.connect(this.port, "localhost", () => {
      this.clientOnConnect();
      this.socket.on("close", () => {
      });
    });    
  }


  clientOnConnect() {
    this.sendPacket(100, 10);
  }
  
  clienOnPacket(pktId, packet) {
    this.callbacks.onPacket(this.clientId, pktId, packet);
  }

  onDisconnect() {
    this.callbacks.onDisconnect(this.clientId);
  }

  sendPacket(length, pktId) {
    let packet = this.makePacket(length, pktId);
  }


  setVarInt(val, buf) {
    let bytes = [];

    while (val) {
      bytes.push(val & 0x7f);
      val = val >> 7;
    }

    let last = bytes.length - 1;
    bytes.reverse().forEach((item, i) => {
      if (last != i) {
        item &= 0x80;
      }
    });
    
  }
  

}





utils = {

  getParam: function(opts) {

    let confArgs = utils.getConfArgs();
    let args     = confArgs.concat(process.argv.slice(2));
    let getopt   = new Getopt(opts).bindHelp();
    let opt      = getopt.parse(args);

    return opt;

  },
  

  // Read args from the config file
  getConfArgs: function() {

    let args   = [];
    let global = {};
    
    let confName = os.homedir() + "/.scripts/" +
        path.basename(process.argv[1]) + ".conf";
    if (!fs.existsSync(confName)){
      confName = "/etc/" + path.basename(process.argv[1]) + ".conf";
     }
    if (fs.existsSync(confName)) {

      let lines = fs.readFileSync(confName, 'utf-8')
          .split('\n')
          .filter(Boolean);
      
      let section = "command-line-args";

      for (let line of lines) {
        let match = line.match(/^\s*\[([^\]]+)\]/);
        if (match) {
          section = match[1];
        }
        else {
          let params = line.match(/^\s*([^=\s]+)\s*=\s*(.*)/);
          if (params) {
            if (section == "command-line-args") {
              if (!global.quiet) {
                console.log("Learned command line arg: ", params[1], params[2]);
              }
              args.push(`--${params[1]}=${params[2]}`);
            }
            else if (section == "global-settings") {
              global[params[1]] = params[2];
            }
          }
        }
      }
    }
    
    return args;

  },
 
  
};


let main = new Main();
