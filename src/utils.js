'use strict';

const fs         = require('fs');
const os         = require('os');
const Getopt     = require('node-getopt');
const readline   = require('readline');
const path       = require('path');


export let utils = {

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
