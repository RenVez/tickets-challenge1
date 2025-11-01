const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

app.use(express.static(path.join(__dirname, 'public')));

let participants = {}; // { username: {count, running, remaining, timer} }

io.on('connection', (socket) => {
  console.log('New connection:', socket.id);

  // При подключении отправляем текущее состояние
  socket.emit('updateState', participants);

  socket.on('join', (username) => {
    if (!participants[username]) {
      participants[username] = { count: 0, running: false, remaining: 0 };
    }
    io.emit('updateState', participants);
  });

  socket.on('increment', (username) => {
    const p = participants[username];
    if (p && p.running && p.remaining > 0) {
      p.count++;
      io.emit('updateState', participants);
    }
  });

  // 🟢 Новый функционал — каждый сам себе запускает таймер
  socket.on('startSelfTimer', ({ username, seconds }) => {
    const p = participants[username];
    if (!p) return;

    // если у пользователя уже был таймер — остановим его
    if (p.timer) clearInterval(p.timer);

    p.running = true;
    p.remaining = seconds;

    p.timer = setInterval(() => {
      p.remaining--;
      if (p.remaining <= 0) {
        p.running = false;
        p.remaining = 0;
        clearInterval(p.timer);
      }
      io.emit('updateState', participants);
    }, 1000);

    io.emit('updateState', participants);
  });
});

  socket.on('adminStart', ({ password, username, seconds }) => {
    if (password !== ADMIN_PASSWORD) return;
    const p = participants[username];
    if (!p) return;

    if (p.timer) clearInterval(p.timer);

    p.running = true;
    p.remaining = seconds;

    p.timer = setInterval(() => {
      p.remaining--;
      if (p.remaining <= 0) {
        p.running = false;
        p.remaining = 0;
        clearInterval(p.timer);
      }
      io.emit('updateState', participants);
    }, 1000);

    io.emit('updateState', participants);
  });

  socket.on('adminStop', ({ password, username }) => {
    if (password !== ADMIN_PASSWORD) return;
    const p = participants[username];
    if (!p) return;
    p.running = false;
    p.remaining = 0;
    if (p.timer) clearInterval(p.timer);
    io.emit('updateState', participants);
  });

  socket.on('adminReset', (password) => {
    if (password !== ADMIN_PASSWORD) return;
    for (let u in participants) {
      if (participants[u].timer) clearInterval(participants[u].timer);
      participants[u] = { count: 0, running: false, remaining: 0 };
    }
    io.emit('updateState', participants);
  });
});

server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
