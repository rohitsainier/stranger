const express = require("express");
const http = require("http");

const app = express();
app.use(express.static("public"));

const server = http.createServer(app);

const io = require("socket.io")(server, {
  allowEIO3: true, //False by default
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Object to store room information.
const rooms = [];

io.on("connection", (socket) => {
  console.log("User connected with ID:", socket.id);
  const roomID = generateRandomRoomID();
  const availableRooms = rooms.filter((room) => room.users.length === 1);

  if (availableRooms.length === 0) {
    // Create new room
    createNewRoom(roomID, socket.id);
  } else {
    // add new user into the existing room
    addIntoExistingRoom(availableRooms[0].id, socket.id);
  }
  // Rooms
  console.log("Rooms:", rooms);

  // Send a welcome message to the connected user
  socket.emit("message", {
    type: "text",
    content: "Welcome to the random video call!",
  });

  // Handle WebRTC signaling messages from the client
  socket.on("message", (message) => {
    // Check the message type
    if (message.type === "offer") {
      // Handle the offer and send back an answer
      handleOffer(socket, message, availableRooms, roomID);
    } else if (message.type === "answer") {
      // Handle the answer
      handleAnswer(socket, message, availableRooms, roomID);
    } else if (message.type === "candidate") {
      // Handle ICE candidate
      handleCandidate(socket, message, availableRooms, roomID);
    } else {
      console.warn("Unknown message type:", message.type);
    }
  });

  // Store the user ID and corresponding socket ID
  const userId = socket.id;

  // Send the user ID to the connected user
  socket.emit("message", { type: "userId", userId });

  socket.on("disconnect", () => {
    console.log("User disconnected:", userId);
    // Remove the user from room
    leaveRoom(userId);
  });
});

function handleOffer(socket, offer, availableRooms, roomID) {
  console.log("Received offer from:", offer.from);
  if (availableRooms.length !== 0) {
    const room = rooms.find((room) => room.id === availableRooms[0].id);
    if (room) {
      const otherUser = room.users.find((userId) => userId !== socket.id);
      // emit the offe to other user
      console.log("Offer sent to:", otherUser);
      socket.to(otherUser).emit("message", {
        type: "offer",
        from: socket.id,
        offer,
      });
    }
  } else {
    const room = rooms.find((room) => room.id === roomID);
    if (room) {
      const otherUser = room.users.find((userId) => userId !== socket.id);
      // emit the offe to other user
      console.log("Offer sent to:", otherUser);
      socket.to(otherUser).emit("message", {
        type: "offer",
        from: socket.id,
        offer,
      });
    }
  }
}

// Handle the answer from the client
function handleAnswer(socket, answer, availableRooms, roomID) {
  console.log("Received answer:", answer.from);
  if (availableRooms.length !== 0) {
    const room = rooms.find((room) => room.id === availableRooms[0].id);
    if (room) {
      const otherUser = room.users.find((userId) => userId !== socket.id);
      // emit the offe to other user
      console.log("Answer sent to:", otherUser);
      socket.to(otherUser).emit("message", {
        type: "answer",
        from: socket.id,
        answer,
      });
    }
  } else {
    const room = rooms.find((room) => room.id === roomID);
    if (room) {
      const otherUser = room.users.find((userId) => userId !== socket.id);
      // emit the offe to other user
      console.log("Answer sent to:", otherUser);
      socket.to(otherUser).emit("message", {
        type: "answer",
        from: socket.id,
        answer,
      });
    }
  }
}

// Handle ICE candidates from the client
function handleCandidate(socket, candidate, availableRooms, roomID) {
  console.log("Received ICE candidate:", candidate.from);
  if (availableRooms.length !== 0) {
    const room = rooms.find((room) => room.id === availableRooms[0].id);
    if (room) {
      const otherUser = room.users.find((userId) => userId !== socket.id);
      // emit the offe to other user
      console.log("candidate sent to:", otherUser);
      socket.to(otherUser).emit("message", {
        type: "candidate",
        from: socket.id,
        candidate,
      });
    }
  } else {
    const room = rooms.find((room) => room.id === roomID);
    if (room) {
      const otherUser = room.users.find((userId) => userId !== socket.id);
      // emit the offe to other user
      console.log("candidate sent to:", otherUser);
      socket.to(otherUser).emit("message", {
        type: "candidate",
        from: socket.id,
        candidate,
      });
    }
  }
}

// Funcation to generate a random room ID
function generateRandomRoomID() {
  return Math.floor(Math.random() * 10000);
}

// Function to create a new room
function createNewRoom(roomId, user) {
  const newRoom = new Room(roomId, [user]);
  rooms.push(newRoom);
}

// Function to add a new user into existing room
function addIntoExistingRoom(roomId, user) {
  const room = rooms.find((room) => room.id === roomId);
  if (room && room.users.length === 1) {
    room.users.push(user);
  }
}

// Function to remove user from existing room based upon roomID
function leaveRoom(userId) {
  console.log("Removing user from room:", userId);
  const roomIndex = rooms.findIndex((room) => room.users.includes(userId));
  if (roomIndex !== -1) {
    const room = rooms[roomIndex];
    room.users.splice(room.users.indexOf(userId), 1); // Remove the user from the users array

    if (room.users.length === 0) {
      rooms.splice(roomIndex, 1); // Remove the room if it's empty
    }
  }
  console.log(rooms);
}

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

class Room {
  constructor(id, users) {
    this.id = id;
    this.users = users;
  }
}
