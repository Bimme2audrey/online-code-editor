const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000', // Frontend URL
    methods: ['GET', 'POST'],
  },
});

// In-memory storage
let codeState = {
  html: '',
  css: '',
  js: '',
};

let connectedUsers = [];

io.on('connection', (socket) => {
  console.log('🟢 New client connected:', socket.id);

  // When a user joins
  socket.on('join', (user) => {
    if (user) {
      const enrichedUser = {
        uid: user.uid,
        name: user.name || 'Anonymous',
        email: user.email || '',
        avatar: user.photoURL || '',
        socketId: socket.id,
      };

      // Avoid duplicate entries
      const exists = connectedUsers.some(u => u.uid === enrichedUser.uid);
      if (!exists) {
        connectedUsers.push(enrichedUser);
      }

      // Emit updated list to everyone
      io.emit('user-joined', connectedUsers);

      // Send initial data to the new user
      socket.emit('init', {
        html: codeState.html,
        css: codeState.css,
        js: codeState.js,
        users: connectedUsers,
      });
    }
  });

  // When code changes
  socket.on('code-change', ({ type, value }) => {
    codeState[type] = value;
    socket.broadcast.emit('remote-change', { type, value });
  });

  // Typing indicator: user starts typing
  socket.on('typing', ({ uid }) => {
    console.log(`${uid} is typing...`);
    socket.broadcast.emit('user-typing', { uid });
  });

  // Typing indicator: user stops typing
  socket.on('stop-typing', ({ uid }) => {
    console.log(`${uid} stopped typing.`);
    socket.broadcast.emit('user-stop-typing', { uid });
  });

  // When user disconnects
  socket.on('disconnect', () => {
    console.log('🔴 Client disconnected:', socket.id);

    // Remove user based on socket ID
    connectedUsers = connectedUsers.filter(user => user.socketId !== socket.id);

    // Broadcast updated user list
    io.emit('user-left', connectedUsers);
  });
});

// Optional route for user info (not used in socket handling)
app.post('/api/users', (req, res) => {
  const { uid, name, email, photoURL } = req.body;
  console.log('User saved:', { uid, name, email, photoURL });
  res.status(200).json({ message: 'User received on server' });
});

const PORT = 4000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
