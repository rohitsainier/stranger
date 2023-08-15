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

const rooms = []; // Object to store room information.

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
        const availableRooms = rooms.filter(room => room.users.length === 1);
        if (availableRooms.length === 0) {
            // Create new room
            console.log("if")
            createNewRoom(roomID, socket.id)
        }  else {
            // add new user into the existing room
            console.log("else")
            addIntoExistingRoom(availableRooms[0].id, socket.id)
        }
        
        if (availableRooms.length !== 0) {
            const room = rooms.find(room => room.id === availableRooms[0].id);
            const otherUser = room.users.find(userId => userId !== socket.id);
            informUsers(otherUser, socket)
        } else {
            const room = rooms.find(room => room.id === roomID);
            const otherUser = room.users.find(userId => userId !== socket.id);
            informUsers(otherUser, socket)
        }
        console.log("Rooms", rooms)
    });

    socket.on("leave room", (roomID, userId) => {
        // remove user from existing room based upon roomID or remove room
        leaveRoom(roomID, userId)
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

// Function to create a new room
function createNewRoom(roomId, user) {
    const newRoom = new Room(roomId, [user]);
    rooms.push(newRoom);
}

// Function to add a new user into existing room
function addIntoExistingRoom(roomId, user) {
    const room = rooms.find(room => room.id === roomId);
    room.users.push(user);
}

// Function to remove user from existing room based upon roomID
function leaveRoom(roomId, userId) {
    const room = rooms.find(room => room.id === roomId);
    const users = room.users
    if (users.length === 1) {
        rooms.pop(room)
    } else {
        const indexToRemove = users.indexOf(userId);
        users.splice(indexToRemove, 1);
    }
    
}

// Function to notify join room
function informUsers(otherUser, socket) {
    if (otherUser) {
        socket.emit("other user", otherUser); // Inform the current user about the other user.
        socket.to(otherUser).emit("user joined", socket.id); // Inform the other user about the current user.
    }
}

// Start the server and listen on port 8000.
server.listen(8000, () => console.log('Server is running on port 8000'));


class Room {
    constructor(id, users) {
        this.id = id;
        this.users = users;
    }
}