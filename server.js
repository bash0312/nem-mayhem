// Setting up required components
/* ----------------------------------------------------------------- */
var http = require('http'),
    path = require('path'),
    isProduction = (process.env.NODE_ENV === 'production'),
    port = isProduction ? 80 : process.env.PORT || 8000,
    express = require('express'),
    app = express(),
    socketio = require('socket.io'),
    server, io, players, highScores,
    nemapi = require('nem-api'), // NEM API
    bob = new nemapi('http://bob.nem.ninja:7890'); // NEM API

var util = {
        processScore: function (points) {
            var medalSizes = [10000, 5000, 1000, 1];
            var medalCounts = {10000: 0, 5000: 0, 1000: 0, 1: 0};

            var remainder,
                currentMedal = medalSizes.shift(),
              accum = points;

            while (accum > 0) {
                remainder = accum % currentMedal;
              if (remainder == accum) { // currentMedal was too big, step down
                currentMedal = medalSizes.shift();
              } else {
                medalCounts[currentMedal] = medalCounts[currentMedal] + 1;
                accum = accum - currentMedal;
              }
            }

            return medalCounts;
        }
    }

// this is the wallet where the XEM will be sent when users buy points
var serverWalletAddress = "TC3Y4XPUUEUS5FHCA5UVSRPE7L64OL6FKAT7DZ4M";
// this is the private key for the wallet which will send XEM to users when they withdraw their points
var serverPrivateKey = "a17ccf6be7ad6afff853e24c0646d2519775ab97f645e605be5b7562bec10ae6";

function subscribeTX() {
    var thing = bob.subscribeWS("/unconfirmed/" + serverWalletAddress, function(message) {
        console.log(message.body);
        var data = JSON.parse(message.body)
        io.sockets.emit('transaction', { message: data.transaction.message.payload, amount: data.transaction.amount });
    });
    bob.sendWS("/w/api/account/transfers/all", {}, "{'account':'"+serverWalletAddress+"'}");
}

function subscribeERR() {
    bob.subscribeWS("/errors", function (message) {
        console.log(message.body);
    });
}

var connectWS = function() {
    bob.connectWS(function () {
    subscribeERR();
    subscribeTX();
    console.log("Asynchronous Magic! (One)")
}, function() {
  console.log("This triggers on disconnect.");
  connectWS();
});
}

bob.connectWS(function () {
    subscribeERR();
    subscribeTX();
    console.log("Asynchronous Magic! (One)")
}, function() {
  console.log("This triggers on disconnect.");
  connectWS();
});

console.log("Asynchronous Magic! (Two)")

// Setting up express for routing
app.set('port', port);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// Routing
/* ----------------------------------------------------------------- */
app.get('/', function (req, res) {
    res.render('index');
});

app.get('/game', function (req, res) {
    res.render('game', { serverWalletAddress: serverWalletAddress });
});

// ALLOW PLAYERS TO SELL THEIR POINTS FOR XEM
app.post("/points/sell", function(req, res){

    var privatekey = serverPrivateKey;
    var recipient = req.body.walletAddress;
    var points = req.body.points;
    var amount = util.processScore(points);
	
	var gold = { "mayhem:gold": {"creator":"746d27528ba3ada7201c687f47b7414bd82dab81186f4ad6d50bfcd7ea8b345f","description":"NEM Mayhem Gold Tokens","id":{"namespaceId":"mayhem","name":"gold"},"properties":[{"name":"divisibility","value":"0"},{"name":"initialSupply","value":"100000"},{"name":"supplyMutable","value":"true"},{"name":"transferable","value":"true"}],"levy":{}}};
	var silver = { "mayhem:silver": {"creator":"746d27528ba3ada7201c687f47b7414bd82dab81186f4ad6d50bfcd7ea8b345f","description":"NEM Mayhem Silver Tokens","id":{"namespaceId":"mayhem","name":"silver"},"properties":[{"name":"divisibility","value":"0"},{"name":"initialSupply","value":"500000"},{"name":"supplyMutable","value":"true"},{"name":"transferable","value":"true"}],"levy":{}}}
	var bronze = { "mayhem:bronze": {"creator":"746d27528ba3ada7201c687f47b7414bd82dab81186f4ad6d50bfcd7ea8b345f","description":"NEM Mayhem Bronze Tokens","id":{"namespaceId":"mayhem","name":"bronze"},"properties":[{"name":"divisibility","value":"0"},{"name":"initialSupply","value":"1000000"},{"name":"supplyMutable","value":"true"},{"name":"transferable","value":"true"}],"levy":{}}}
    // 10000 points is a gold
    // 5000 points is silver
    // 1000 points is a bronze
    // any less is nothing

	var tx = {
	  "isMultsisig": false,
	  "recipient": recipient,
	  "multiplier": "1",
	  "due": 60,
	  "message": "",
	  "mosaics": [{
		   'mosaicId': { "namespaceId": "mayhem", "name": "gold" },
		   'quantity': 1
		}]
	}
	
	if (amount[10000] > 0) {
		tx.mosaics = [{
		   'mosaicId': { "namespaceId": "mayhem", "name": "gold" },
		   'quantity': amount[10000]
		}];
		var fTX = bob.makeTX2(tx, gold, "db999bc638b984cea4809d37d2910c456fca77c230b4b7e76ae3b3ef4843e37e");
		var transactionobject = bob.signTX(fTX, "db999bc638b984cea4809d37d2910c456fca77c230b4b7e76ae3b3ef4843e37e");
		bob.post("/transaction/announce", transactionobject, function(response) {
		  res.send("Success!");
		});
	}
	
	if (amount[5000] > 0) {
		tx.mosaics = [{
		   'mosaicId': { "namespaceId": "mayhem", "name": "silver" },
		   'quantity': amount[5000]
		}];
		var fTX = bob.makeTX2(tx, silver, "db999bc638b984cea4809d37d2910c456fca77c230b4b7e76ae3b3ef4843e37e");
		var transactionobject = bob.signTX(fTX, "db999bc638b984cea4809d37d2910c456fca77c230b4b7e76ae3b3ef4843e37e");
		bob.post("/transaction/announce", transactionobject, function(response) {
		  res.send("Success!");
		});
	}
	
	if (amount[1000] > 0) {
		tx.mosaics = [{
		   'mosaicId': { "namespaceId": "mayhem", "name": "bronze" },
		   'quantity': amount[1000]
		}];
		var fTX = bob.makeTX2(tx, bronze, "db999bc638b984cea4809d37d2910c456fca77c230b4b7e76ae3b3ef4843e37e");
		var transactionobject = bob.signTX(fTX, "db999bc638b984cea4809d37d2910c456fca77c230b4b7e76ae3b3ef4843e37e");
		bob.post("/transaction/announce", transactionobject, function(response) {
		  res.send("Success!");
		});
	}
});

// Socket.io: Setting up multiplayer
/* ----------------------------------------------------------------- */

server = http.createServer(app);
io = socketio.listen(server);
players = {};
highScores = {};


// Socket.io: Setting up event handlers for all the messages that come
// in from the client (check out /public/js/game.js and /views/game.jade
// for that).

io.on('connection', function (socket) {
    socket.on('disconnect', function () {
        socket.broadcast.emit('removePlayer', socket.sessionId);
        delete players[socket.sessionId];
        delete highScores[socket.sessionId];
        io.sockets.emit('highScores', highScores);
    });

    socket.on('gameReady', function (data) {
        socket.sessionId = data.id;
        socket.playerName = data.name;

        if (players[data.id]) {
            socket.broadcast.emit('removePlayer', socket.sessionId);
            delete players[socket.sessionId];
            delete highScores[socket.sessionId];
            io.sockets.emit('highScores', highScores);
        }

        var player = {
            id: data.id,
            z: 6,
            health: 3,
            score: 0,
            p: {
                x: 8 * 48,
                y: 2 * 48
            },
            n: socket.playerName
        };

        highScores[data.id] = {
            name: socket.playerName,
            score: 0
        };

        socket.broadcast.emit('addPlayer', player);
        players[data.id] = player;
        socket.emit('playerId', data.id);
        socket.emit('addMainPlayer', player);
        socket.emit('addPlayers', players);
        io.sockets.emit('highScores', highScores);
    });

    socket.on('updatePlayerState', function (position, state) {
        if (!players[socket.sessionId]) {
            return;
        }

        players[socket.sessionId].p = position;
        socket.broadcast.emit('updatePlayerState', {
            id: socket.sessionId,
            p: position,
            s: state
        });
    });

    socket.on('fireBullet', function (id, source, target) {
        socket.broadcast.emit('fireBullet', id, source, target);
    });

    socket.on('playerHit', function (data) {
        socket.broadcast.emit('remotePlayerHit', data);
    });

    socket.on('scoreHit', function () {
        var player = players[socket.sessionId];
        if (!player) {
            return;
        }
        player.score = player.score ? player.score + 100 : 100;
        socket.emit('score', player.score);
        highScores[player.id] = {
            name: player.n,
            score: player.score
        };
        io.sockets.emit('highScores', highScores);
    });

    // NEM API
    socket.on('boostScore', function (data) {
        var player = players[socket.sessionId];
        if (!player) {
            return;
        }
        player.score = player.score ? player.score + data.points : data.points;
        socket.emit('score', player.score);
        highScores[player.id] = {
            name: player.n,
            score: player.score
        };
        io.sockets.emit('highScores', highScores);
    });

    socket.on('resetPlayer', function () {
        var player = {
            id: socket.sessionId,
            z: 6,
            score: 0,
            health: 3,
            p: {
                x: 8 * 48,
                y: 2 * 48
            },
            n: socket.playerName
        };
        socket.broadcast.emit('removePlayer', player.id);
        socket.broadcast.emit('addPlayer', player);
        socket.emit('addMainPlayer', player);
    });

    socket.on('playerHealed', function (data) {
        socket.broadcast.emit('remotePlayerHealed', data);
    });
});

// ...and actually starting the server!
/* ----------------------------------------------------------------- */

server.listen(app.get('port'), '0.0.0.0', function () {
    console.log('\n' +
        '----------------------------\n' +
        '|   Welcome to NEM Mayhem! |\n' +
        '----------------------------\n' +
        'Server listening on port ' + app.get('port') + '.');
});