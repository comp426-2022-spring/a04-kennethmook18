const express = require('express')
const app = express()
const morgan = require('morgan')
const logdb = require('./database')
const fs = require('fs')

// Make express use its own built-in body parser
app.use(express.urlencoded({ extended: true}));
app.use(express.json());

// Require minimist module
const args = require('minimist')(process.argv.slice(2))

const port = args.port || process.env.PORT || 5555

//CoinFlip functions 
function coinFlip() {
  return Math.random() > 0.5 ? ('heads') : ('tails');
}

function coinFlips(flips) {
  var tosses = []
  for (let i = 0; i < flips; i++) {
    tosses[i] = coinFlip();
  }
  return tosses
}

function countFlips(array) {
  let heads_sum = 0;
  let tails_sum = 0;
  for (let i = 0; i < array.length; i++) {
    if (array[i] == 'heads') {
      heads_sum += 1;
    } else if (array[i] == 'tails') {
      tails_sum += 1;
    }
  }

  if (heads_sum == 0 || tails_sum == 0) {
    if (heads_sum == 0) {
      return "{ tails: " + tails_sum + " }";
    } else if (tails_sum == 0) {
      return "{ heads: " + heads_sum + " }";
    }
  }
  
  return {"heads": heads_sum, "tails": tails_sum };
}

function flipACoin(call) {
  var flip = coinFlip();
  if (call == flip) {
    var status = 'win'
  } else {
    var status = 'lose'
  }
  return  {"call": call, "flip": flip, "result": status };
}

const server = app.listen(port, () => {
    console.log('App is runnin on %port%'.replace('%port%', port))
})

const help = (`
server.js [options]

--port	Set the port number for the server to listen on. Must be an integer
            between 1 and 65535.

--debug	If set to true, creates endlpoints /app/log/access/ which returns
            a JSON access log from the database and /app/error which throws 
            an error with the message "Error test successful." Defaults to 
            false.

--log		If set to false, no log files are written. Defaults to true.
            Logs are always written to database.

--help	Return this message and exit.
`)

// If --help or -h, echo help text to STDOUT and exit
if (args.help || args.h) {
    console.log(help)
    process.exit(0)
}

if(args.log == true) {
  const accesslog = fs.createWriteStream('access.log', { flags: 'a'})
  app.use(morgan('combined', {stream: accesslog}))
}

app.use((req, res, next) => {
  let logdata = {
    remoteaddr: req.ip,
    remoteuser: req.user,
    time: Date.now(),
    method: req.method,
    url: req.url,
    protocol: req.protocol,
    httpversion: req.httpVersion,
    status: res.statusCode,
    referer: req.headers['referer'],
    useragent: req.headers['user-agent']
  }

  const stmt = logdb.prepare('INSERT INTO accesslog (remoteaddr, remoteuser, time, method, url, protocol, httpversion, status, referer, useragent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
  const info = stmt.run(logdata.remoteaddr, logdata.remoteuser, logdata.time, logdata.method, logdata.url, logdata.protocol, logdata.httpversion, logdata.status, logdata.referer, logdata.useragent)
  
  next()
})


if(args.debug) {
  app.get("/app/log/access", (req, res, next) => {
    try {
      const stmt = logdb.prepare('SELECT * FROM accesslog').all();
      res.status(200).json(stmt)
    } catch (e) {
      console.error(e)
    }
  })

  app.get("/app/error", (req, res) => {
    throw new Error("Error test successful")
  });
}

app.get('/app/', (req, res) => {
  res.statusCode = 200; 
  res.statusMessage = 'OK';
  res.writeHead(res.statusCode, { 'Content-Type': 'text/plain' });
  res.end(res.statusCode + ' ' + res.statusMessage);
});


app.get('/app/flip/', (req, res) => {
  let flip = coinFlip();
  res.status(200).json({ "flip": flip });
});


app.get('/app/flips/:number', (req, res) => {
  let results = coinFlips(req.params.number);
  let summary = countFlips(results);
  res.status(200).json({ "results": results, "summary": summary });
});

app.get('/app/flip/call/:guess(heads|tails)/', (req, res, next) => {
  const guess = flipACoin(req.params.guess)
  res.status(200).json(guess)
})

app.use(function(req, res){
    res.status(404).json({"message": "Endpoint not found. (404)"});
}) 