const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer();

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  }
});

const rooms = [];

io.on('connection', (socket) => {
  const clientId = socket.handshake?.query?.clientId;

  if (clientId) {
    socket.clientId = clientId;
  }
  console.log(socket.clientId + ' connected');

  socket.on('join', (room, initialData) => {
    if (room && room in rooms) {
      socket.room = room;
      socket.join(room);
      socket.emit('receive-data', {
        players: rooms[socket.room].players,
        countdown: rooms[socket.room].countdown,
        turnIndex: rooms[socket.room].turnIndex,
      });
      if (socket.clientId === rooms[socket.room].controller) {
        socket.emit('receive-role', 'controller');
      } else {
        socket.emit('receive-role', 'listener');
      }
      console.log(socket.clientId + " joined room " + room);
    } else if (room && initialData) {
      socket.room = room;
      socket.join(room);
      rooms[room] = {
        controller: socket.clientId,
        players: initialData.players,
        countdown: initialData.countdown,
        turnIndex: initialData.turnIndex,
      }
      socket.emit('receive-role', 'controller');
      console.log(socket.clientId + " started room " + room);
    } else {
      socket.emit('fail-join');
    }
  });

  socket.on('update-players', (players) => {
    if (rooms[socket.room] && rooms[socket.room].controller === socket.clientId) {
      rooms[socket.room].players = players;
      socket.to(socket.room).emit('update-players', players);
    }
  });

  socket.on('update-turn', turnIndex => {
    if (rooms[socket.room] && rooms[socket.room].controller === socket.clientId) {
      rooms[socket.room].turnIndex = turnIndex;
      socket.to(socket.room).emit('update-turn', turnIndex);
    }
  });

  socket.on('update-countdown', countdown => {
    if (rooms[socket.room] && rooms[socket.room].controller === socket.clientId) {
      rooms[socket.room].countdown  = countdown;
      socket.to(socket.room).emit('update-countdown', countdown);
    }
  });

  socket.on('disconnect', async () => {
    console.log(`${socket.clientId} disconnected`);
    const roomSockets = await io.in(socket.room).fetchSockets();
    if (roomSockets.length === 0 && rooms[socket.room]) {
      delete rooms[socket.room];
      console.log("Room " + socket.room + " deleted");
    }
  });

});

// Start listening on a port
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
