const socket = io("http://localhost:3000");
const localVideo = document.getElementById("local-video");
const remoteVideo = document.getElementById("remote-video");
const startCallButton = document.getElementById("start-call");
const endCallButton = document.getElementById("end-call");
let peerConnection;

console.log("Trying to connect to the server...");

// Function to start the call
function startCall() {
  // Request access to the user's media
  navigator.mediaDevices
    .getUserMedia({ video: true, audio: true })
    .then((stream) => {
      // Set the local video stream
      localVideo.srcObject = stream;

      // Create a peer connection
      createPeerConnection();

      // Disable the "Start Call" button and enable the "End Call" button
      startCallButton.disabled = true;
      endCallButton.disabled = false;
    })
    .catch((error) => {
      console.error("Error accessing media devices:", error);
    });
}

// Function to end the call
function endCall() {
  if (peerConnection) {
    peerConnection.close();
  }

  // Disable the "End Call" button and enable the "Start Call" button
  startCallButton.disabled = false;
  endCallButton.disabled = true;
}

// Function to create a peer connection
function createPeerConnection() {
  console.log("Creating peer...");
  const iceServers = [
    { urls: "stun:stun.l.google.com:19302" },
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ];

  peerConnection = new RTCPeerConnection({
    iceServers: iceServers,
    googEchoCancellation: true,
    googAutoGainControl: true,
  });

  // Get the local stream from the local video element
  const localStream = localVideo.srcObject;

  // Add each track from the local stream to the peer connection
  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  // Set up event handlers for the connection
  peerConnection.onicecandidate = handleICECandidateEvent;
  peerConnection.ontrack = handleRemoteStreamEvent;

  // Trigger createOffer when negotiation is needed
  peerConnection.onnegotiationneeded = () => {
    createOffer();
  };

  // Handle errors during the creation of the peer connection
  peerConnection.onerror = (error) => {
    console.error("Peer connection error:", error);
  };
}

// Function to create and send an offer
function createOffer() {
  if (!peerConnection) {
    console.error("Peer connection not available.");
    return;
  }
  console.log("Creating offer...");
  peerConnection
    .createOffer()
    .then((offer) => {
      return peerConnection.setLocalDescription(offer);
    })
    .then(() => {
      if (peerConnection.localDescription) {
        socket.emit("message", {
          type: "offer",
          from: socket.id,
          sdp: peerConnection.localDescription,
        });
      } else {
        console.error("Local description not available.");
      }
    })
    .catch((error) => {
      console.error("Error creating offer:", error);

      // If an error occurs, reset the local description to avoid inconsistencies
      peerConnection
        .setLocalDescription({ type: "rollback" })
        .catch((rollbackError) => {
          console.error("Error rolling back local description:", rollbackError);
        });
    });
}

// Function to handle the offer from the server
function handleOffer(message) {
  // check if the peer connection exists if not skip
  if (!peerConnection) {
    console.error("Peer connection not available.");
    return;
  }
  const remoteSDP = new RTCSessionDescription(message.offer.sdp);

  peerConnection
    .setRemoteDescription(remoteSDP)
    .then(() => {
      return peerConnection.createAnswer();
    })
    .then((answer) => {
      return peerConnection.setLocalDescription(answer);
    })
    .then(() => {
      socket.emit("message", {
        type: "answer",
        from: socket.id,
        sdp: peerConnection.localDescription,
      });
    })
    .catch((error) => {
      console.error("Error handling offer:", error);
    });
}

// Function to handle the answer from the server
function handleAnswer(message) {
  // check if the peer connection exists if not skip
  if (!peerConnection) {
    console.error("Peer connection not available.");
    return;
  }
  const remoteSDP = new RTCSessionDescription(message.answer.sdp);

  peerConnection.setRemoteDescription(remoteSDP).catch((error) => {
    console.error("Error handling answer:", error);
  });
}

// Function to handle ICE candidate events
function handleICECandidateEvent(event) {
  if (event.candidate) {
    socket.emit("message", {
      type: "candidate",
      from: socket.id,
      candidate: event.candidate,
    });
  }
}

// Function to handle remote stream events
function handleRemoteStreamEvent(event) {
  // add all the track into remote video
  remoteVideo.srcObject = event.streams[0];
}

// Function to handle ICE candidate messages from the server
function handleCandidate(message) {
  // check if the peer connection exists if not skip
  if (!peerConnection) {
    console.error("Peer connection not available.");
    return;
  }
  const candidate = new RTCIceCandidate(message.candidate.candidate);

  peerConnection.addIceCandidate(candidate).catch((error) => {
    console.error("Error handling candidate:", error);
  });
}

// Establish a connection to the signaling server
socket.on("connect", () => {
  console.log("Connected to the server");
});

// Handle WebRTC signaling messages from the server
socket.on("message", (message) => {
  console.log("Received message from the server:", message);
  if (message.type === "offer") {
    handleOffer(message);
  } else if (message.type === "answer") {
    handleAnswer(message);
  } else if (message.type === "candidate") {
    handleCandidate(message);
  }
});

// Handle disconnection from the server
socket.on("disconnect", () => {
  console.log("Disconnected from the server");
});
