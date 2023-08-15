const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);
const socket = require("socket.io");
const io = socket(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
});

const rooms = {}; // Object to store room information.

/**
 * Handle socket.io connections and events for video conferencing.
 *
 * @param {Socket} socket - The socket instance for a connected client.
 */
io.on("connection", socket => {
    /**
     * Handle a client's request to join a room for video conferencing.
     *
     * @param {string} roomID - The ID of the room to join.
     */
    socket.on("join room", roomID => {
        if (rooms[roomID]) {
            rooms[roomID].push(socket.id);
        } else {
            rooms[roomID] = [socket.id];
        }
        console.log("Rooms", rooms)
        // Find the other user in the room and establish connections.
        const otherUser = rooms[roomID].find(id => id !== socket.id);
        console.log("OtherUser", otherUser)
        console.log("CurrentUser", socket.id)
        if (otherUser) {
            socket.emit("other user", otherUser); // Inform the current user about the other user.
            socket.to(otherUser).emit("user joined", socket.id); // Inform the other user about the current user.
        }
    });

    /**
     * Handle the transmission of an offer message to a specific target user.
     *
     * @param {Object} payload - The offer message payload containing target and offer SDP.
     */
    socket.on("offer", payload => {
        io.to(payload.target).emit("offer", payload); // Emit the offer to the target user.
    });

    /**
     * Handle the transmission of an answer message to a specific target user.
     *
     * @param {Object} payload - The answer message payload containing target and answer SDP.
     */
    socket.on("answer", payload => {
        io.to(payload.target).emit("answer", payload); // Emit the answer to the target user.
    });

    /**
     * Handle the transmission of ICE candidate information to a specific target user.
     *
     * @param {Object} incoming - The ICE candidate information payload containing target and candidate.
     */
    socket.on("ice-candidate", incoming => {
        io.to(incoming.target).emit("ice-candidate", incoming.candidate); // Emit the ICE candidate to the target user.
    });
});

// Start the server and listen on port 8000.
server.listen(8000, () => console.log('Server is running on port 8000'));

