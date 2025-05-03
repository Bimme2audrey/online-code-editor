const express = require('express');
const http = require('http');
const cors = require('cors'); 
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);


app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST'],
  credentials: true
}));

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

let users = [];
let code = { html: '', css: '', js: '' };

app.use(express.static('public'));

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  const user = {
    id: socket.id,
    name: `User ${socket.id.substring(0, 5)}`,
    avatar: '/default-avatar.png'
  };

  users.push(user);

  // Send full state to the new user
  socket.emit('init', { html: code.html, css: code.css, js: code.js, users });

  // Notify everyone (including the new user) about the full updated user list
  io.emit('user-joined', users);

  socket.on('code-change', (data) => {
    if (data.type === 'html') code.html = data.value;
    if (data.type === 'css') code.css = data.value;
    if (data.type === 'js') code.js = data.value;

    io.emit('remote-change', { type: data.type, value: data.value, user });
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
    users = users.filter((u) => u.id !== socket.id);
    io.emit('user-left', users);
  });
});

const port = process.env.PORT || 4000;
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
