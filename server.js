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
      handleOffer(socket, message);
    } else if (message.type === "answer") {
      // Handle the answer
      handleAnswer(socket, message);
    } else if (message.type === "candidate") {
      // Handle ICE candidate
      handleCandidate(socket, message);
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
    // Remove the user ID and corresponding socket ID from the map
  });
});

function handleOffer(socket, offer) {
  console.log("Received offer from:", offer.from);
}

// Handle the answer from the client
function handleAnswer(socket, answer) {
  console.log("Received answer:", answer.from);
}

// Handle ICE candidates from the client
function handleCandidate(socket, candidate) {
  console.log("Received ICE candidate:", candidate.from);
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
