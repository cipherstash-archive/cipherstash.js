#!/usr/bin/env node

const repl = require("repl");
const { Stash } = require("@cipherstash/stashjs");
const { movieSchema, Movie } = require("./dist/example-schema");
const vm = require("vm");
const fs = require("fs");
const { processTopLevelAwait } = require("node-repl-await");

function isRecoverableError(error) {
  if (error.name === 'SyntaxError') {
    return /^(Unexpected end of input|Unexpected token)/.test(error.message);
  }
  return false;
}

async function myEval(code, context, filename, callback) {
  code = processTopLevelAwait(code) || code;

  try {
    let result = await vm.runInNewContext(code, context);
    callback(null, result);
  } catch (e) {
    if (isRecoverableError(e)) {
      callback(new repl.Recoverable(e));
    } else {
      console.log(e);
    }
  }
}

const local = repl.start({ prompt: 'stash> ', eval: myEval });
let stash = null;
let collectionCache = {}

/*
 * TODO: History
fs.statSync('.node_repl_history')
console.log(fs.readFileSync('.node_repl_history'))
.split('\n')
  .reverse()
  .filter(line => line.trim())
  .map(line => server.history.push(line))*/

local.defineCommand('connect', {
  help: 'Connect',
  async action(name) {
    this.clearBufferedCommand();
    console.log("Starting session...")
    stash = await Stash.connect()
    console.log("Connected")
    this.displayPrompt();
  }
});

async function query(name, arg) {
  // TODO: Check that stash is connected
  if (name == "movies") {
    let collection = collectionCache[name] || await stash.loadCollection(movieSchema)
    let result = await collection.query(arg, { limit: 100 })
    result.documents.forEach((record) => {
      record.id = record.id.toString('hex')
      console.log(record)
    })
      // TODO: print count
    console.log("-----------------------------------")

    collectionCache[name] = collection
    local.displayPrompt();
    return `Executed in ${result.took} secs`
  } else {
    throw("No such collection")
  }
}

// Exposing the function "mood" to the local REPL's context.
local.context.query = query;
