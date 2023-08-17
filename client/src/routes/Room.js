import React, { useRef, useEffect, useState } from "react";
import io from "socket.io-client";

/**
 * Component for managing video conferencing within a room using WebRTC and socket.io.
 *
 * @param {Object} props - The props passed to the component.
 * @param {Object} props.match - React Router match object containing route parameters.
 * @param {string} props.match.params.roomID - ID of the room for video conferencing.
 * @returns {JSX.Element} Component rendering user and partner video streams.
 */
const Room = (props) => {
    const userVideo = useRef();          // Reference to the user's video element.
    const partnerVideo = useRef();       // Reference to the partner's video element.
    const peerRef = useRef();            // Reference to the WebRTC peer connection.
    const socketRef = useRef();          // Reference to the socket.io connection.
    const otherUser = useRef();          // Reference to the ID of the other user.
    const userStream = useRef();         // Reference to the user's media stream.
    const chatDataChannel = useRef();    // Reference to the user's chat stream.
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState("");

    useEffect(() => {
        // Access user's video stream and set it as source for user's video element.
        navigator.mediaDevices.getUserMedia({ audio: false, video: true }).then(stream => {
            userVideo.current.srcObject = stream;
            userStream.current = stream;

            // Establish socket connection and join the specified room.
            socketRef.current = io.connect("/");
            socketRef.current.emit("join room", props.match.params.roomID);

            // Handle when another user joins the room.
            socketRef.current.on('other user', userID => {
                callUser(userID);
                otherUser.current = userID;
            });

            socketRef.current.on("user joined", userID => {
                otherUser.current = userID;
            });

            socketRef.current.on("offer", handleOffer);

            socketRef.current.on("answer", handleAnswer);

            socketRef.current.on("ice-candidate", handleNewICECandidateMsg);

            // Add event listener for beforeunload to handle user leaving the room.
            window.addEventListener("beforeunload", handleBeforeUnload);
        });
    }, []);
    

    // Function to initiate a call to another user.
    function callUser(userID) {
        // Create a new peer connection for communication.
        peerRef.current = createPeer(userID);      
        
        // Setup chat data channel
        createChatDataChannel();

        // Add user's tracks to the peer connection.
        userStream.current.getTracks().forEach(track => peerRef.current.addTrack(track, userStream.current));
    }

    // Function to initiate a chat data channel.
    function createChatDataChannel() {
        chatDataChannel.current = peerRef.current.createDataChannel("chatDataChannel");
        console.log("Chat data channel created");
        chatDataChannel.current.onmessage = handleReceivedMessage;
    }

    // Function to handle chat data channle stream.
    function handleReceivedMessage(e) {
        setMessages(messages => [...messages,{mine: false, value: e.data}]);
        console.log("Received message:", e.data)
    }

    // Function to handle data channles.
    function handleDataChannels(peerRef) {
        peerRef.current.ondatachannel = (event) => {
            console.log("Received Event", event);
            chatDataChannel.current = event.channel;
            chatDataChannel.current.onmessage = handleReceivedMessage;
        }
    }

    // Function to send message over chat data channel.
    function sendMessage() {
        if (chatDataChannel.current.readyState === "open") {
            const message = text;
            chatDataChannel.current.send(message);
            setMessages(messages => [...messages, { mine: true, value: message }]);
            console.log("Message Sent:", message);
            setText(""); // Clear the text input after sending
        } else {
            console.log("Chat data channel is not yet ready to send messages.");
        }
    }


    // Function to create a new WebRTC peer connection with necessary configuration.
    function createPeer(userID) {
        // Configuration for peer connection including ICE servers.
        const peer = new RTCPeerConnection({
            iceServers: [
                {
                    urls: "stun:stun.l.google.com:19302"
                },
                {
                    "urls": [
                        "turn:13.250.13.83:3478?transport=udp"
                    ],
                    "username": "YzYNCouZM1mhqhmseWk6",
                    "credential": "YzYNCouZM1mhqhmseWk6"
                },
            ]
        });

        // Attach event handlers.
        peer.onicecandidate = handleICECandidateEvent;
        peer.ontrack = handleTrackEvent;
        peer.onnegotiationneeded = () => handleNegotiationNeededEvent(userID);

        return peer;
    }

    // Function to handle the negotiation needed event for peer connection.
    function handleNegotiationNeededEvent(userID) {
        // Create an offer and set it as the local description.
        peerRef.current.createOffer().then(offer => {
            return peerRef.current.setLocalDescription(offer);
        }).then(() => {
            // Emit the offer to the other user.
            const payload = {
                target: userID,
                caller: socketRef.current.id,
                sdp: peerRef.current.localDescription
            };
            console.log(payload);
            socketRef.current.emit("offer", payload);
        }).catch(e => console.log(e));
    }

    // Function to handle the reception of an offer to initiate a call.
    function handleOffer(incoming) {
        // Create a new peer connection to handle the call.
        peerRef.current = createPeer();
        
        // Setup Handle Data Channels
        handleDataChannels(peerRef);

        // Set remote description based on received SDP.
        const desc = new RTCSessionDescription(incoming.sdp);
        peerRef.current.setRemoteDescription(desc).then(() => {
            userStream.current.getTracks().forEach(track => peerRef.current.addTrack(track, userStream.current));
        }).then(() => {
            return peerRef.current.createAnswer();
        }).then(answer => {
            return peerRef.current.setLocalDescription(answer);
        }).then(() => {
            // Send the answer to the caller.
            const payload = {
                target: incoming.caller,
                caller: socketRef.current.id,
                sdp: peerRef.current.localDescription
            };
            console.log(payload);
            socketRef.current.emit("answer", payload);
        });
    }

    // Function to handle the reception of an answer to a call offer.
    function handleAnswer(message) {
        // Set the remote description with the received SDP.
        const desc = new RTCSessionDescription(message.sdp);
        peerRef.current.setRemoteDescription(desc).catch(e => console.log(e));
    }

    // Function to handle the ICE candidate event for peer connection.
    function handleICECandidateEvent(e) {
        if (e.candidate) {
            // Send the ICE candidate to the other user.
            const payload = {
                target: otherUser.current,
                candidate: e.candidate,
            };
            socketRef.current.emit("ice-candidate", payload);
        }
    }

    // Function to handle the reception of a new ICE candidate.
    function handleNewICECandidateMsg(incoming) {
        // Create a new RTCIceCandidate and add it to the peer connection.
        const candidate = new RTCIceCandidate(incoming);

        peerRef.current.addIceCandidate(candidate)
            .catch(e => console.log(e));
    }

    // Function to handle the event when a new track is received.
    function handleTrackEvent(e) {
        partnerVideo.current.srcObject = e.streams[0];
    }
    // Function to handle the event window or tab or browser closed. 
    function handleBeforeUnload(e) {
        // Clean up logic (if needed).
        if (socketRef.current) {
            socketRef.current.emit("leave room");
            socketRef.current.disconnect();
        }
    }

    // Render user and partner video elements.
    return (
        <div className="video-page">
            <div className="video-container">
                <div className="video-wrapper">
                    <video className="video" autoPlay ref={userVideo} />
                    <div className="video-label">You</div>
                </div>
                <div className="video-wrapper">
                    <video className="video" autoPlay ref={partnerVideo} />
                    <div className="video-label">Partner</div>
                </div>
            </div>
            <div className="message-box">
                <input
                    type="text"
                    placeholder="Type a message..."
                    value={text}
                    onChange={(e) => setText(e.target.value)} // Update the 'text' state
                />
                <button onClick={sendMessage}>Send Message</button>
            </div>
            <div className="copyright">Copyright &copy; Stranger</div>
        </div>
    );
};

export default Room;
