const express = require('express');
const app = express();
const PORT = 1000;
const http = require('http').Server(app);
const cors = require('cors');
const { v4: uuidV4 } = require('uuid');
app.use(cors());

const socketIO = require('socket.io')(http, {
    cors: {
        origin: "http://localhost:3000"
    }
});

const rooms = new Map();


socketIO.on('connection', (socket) => {
  console.log(socket.id, 'connected');

  socket.on('username', (username) => {
    console.log(username);
    socket.data.username = username;
  });

  socket.on('createRoom', async (callback) => {
    const roomId = uuidV4();
    await socket.join(roomId);
   
    rooms.set(roomId, {
      roomId,
      players: [{ id: socket.id, username: socket.data?.username }]
    });
    callback(roomId);
  });
  
  socket.on('joinRoom', async (args, callback) => {
    const room = rooms.get(args.roomId);
    let error, message;
    if (!room) {
      error = true;
      message = 'room does not exist';
    } else if (room.length <= 0) {
      error = true;
      message = 'room is empty';
    } else if (room.length >= 2) {
      error = true;
      message = 'room is full';
    }

    if (error) {

      if (callback) { 
        callback({
          error,
          message
        });
      }
      return;
    }
    
    await socket.join(args.roomId);
    const roomsUpdate = {
      ...room,
      players: [
        room.players[0].username,
        socket.data?.username
      ]
    }
    callback(roomsUpdate);
    
    socket.to(args.roomId).emit('opponentJoined', roomsUpdate);

    })

  socket.on('move', (data) => {
    console.log(data);
    socket.to(data.room).emit('move', data);
  });

  socket.on('disconnect', () => {
    console.log(' A user disconnected');
  });
});

app.get('/api', (req, res) => {
  res.json({
    message: 'Hello world',
  });
});

http.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});