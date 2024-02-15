const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer();

const io = new Server(server, {
  cors: {
    origin: '*', // Adjust this to your frontend's URL, e.g., 'http://example.com'
    methods: ['GET', 'POST'], // Specify the allowed HTTP methods
  }
});

const rooms = [];

io.on('connection', (socket) => {
  console.log(socket.id + ' connected');

  socket.on('join', (room) => {
    console.log(socket.id + " joined room " + room);
    socket.join(room);
    socket.room = room;

    if (room in rooms) {
      socket.emit('receive-data', {
        players: rooms[socket.room].players,
        countdown: rooms[socket.room].countdown,
        turnIndex: rooms[socket.room].turnIndex,
        paused: rooms[socket.room].paused
      });
    } else {
      rooms[room] = {
        controller: socket.id,
        players: [],
        countdown: 60,
        turnIndex: 0,
        paused: true
      }
      socket.emit('confirm-controller');
    }
  });

  socket.on('update-players', (players) => {
    console.log('players update:');
    console.log(players);
    if (rooms[socket.room] && rooms[socket.room].controller === socket.id) {
      rooms[socket.room].players = players;
      socket.to(socket.room).emit('update-players', players);
    }
  });

  socket.on('update-turn', turnIndex => {
    console.log('turnIndex update: ' + turnIndex);
    if (rooms[socket.room] && rooms[socket.room].controller === socket.id) {
      rooms[socket.room].turnIndex = turnIndex;
      socket.to(socket.room).emit('update-turn', turnIndex);
    }
  });

  socket.on('update-countdown', countdown => {
    console.log('countdown update: ' + countdown);
    if (rooms[socket.room] && rooms[socket.room].controller === socket.id) {
      rooms[socket.room].countdown  = countdown;
      socket.to(socket.room).emit('update-countdown', countdown);
    }
  });

  socket.on('update-paused', paused => {
    console.log('paused update: ' + paused);
    if (rooms[socket.room] && rooms[socket.room].controller === socket.id) {
      rooms[socket.room].paused = paused;
      socket.to(socket.room).emit('update-paused', paused);
    }
  });

  socket.on('restart', () => {
    if (rooms[socket.room] && rooms[socket.room].controller === socket.id) {

      rooms[socket.room].paused = true;
      rooms[socket.room].countdown = 60;
      rooms[socket.room].players[0].hasExtended = true;
      rooms[socket.room].players[1].hasExtended = true;

      socket.to(socket.room).emit('update-paused', true);
      socket.to(socket.room).emit('update-players', rooms[socket.room].players);
      socket.to(socket.room).emit('update-countdown', 60);
    }
  });

  socket.on('extend', (extendedCountdown) => {
    if (rooms[socket.room] && rooms[socket.room].controller === socket.id) {
      rooms[socket.room].players[rooms[socket.room].turnIndex].hasExtension = false;
      rooms[socket.room].countdown = extendedCountdown;
      socket.to(socket.room).emit('update-countdown', extendedCountdown);
      socket.to(socket.room).emit('update-players', rooms[socket.room].players);
    }
  });

});

// Start listening on a port
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
