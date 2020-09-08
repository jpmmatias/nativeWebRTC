require('dotenv').config();
const express = require('express');
const socketio = require('socket.io');
const http = require('http');
const app = express();
const server = http.createServer(app);
const io = socketio(server);

const PORT = process.env.PORT || 5000;

const rooms = {};

io.on('connect', (socket) => {
	socket.on('join room', (roomID) => {
		if (rooms[roomID]) {
			rooms[roomID].push(socket.id);
		} else {
			rooms[roomID] = [socket.id];
		}
		const otherUser = rooms[roomID].find((id) => id !== socket.id);
		if (otherUser) {
			socket.emit('other user', otherUser);
			socket.to(otherUser).emit('user joined', socket.id);
		}
	});

	socket.on('offer', (payload) => {
		io.to(payload.target).emit('offer', payload);
	});

	socket.on('answer', (payload) => {
		io.to(payload.target).emit('answer', payload);
	});

	socket.on('ice-candidate', (incoming) => {
		io.to(incoming.target).emit('ice-candidate', incoming.candidate);
	});
});

if (process.env.PROD) {
	app.use(express.static(path.join(__dirname, 'client/build')));
	app.get('*', (req, res) =>
		res.sendFile(path.join(__dirname, './client/build/index.html'))
	);
}

server.listen(PORT, () => {
	console.log(`Listining at port ${PORT}`);
});
