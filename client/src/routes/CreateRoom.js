import React from "react";
import { v1 as uuid } from "uuid";

/**
 * Functional component for creating a new room and navigating to it.
 *
 * @param {Object} props - The props passed to the component.
 * @param {Object} props.history - The history object from React Router for navigation.
 * @returns {JSX.Element} A button that, when clicked, creates a new room and navigates to it.
 */
const CreateRoom = (props) => {
    /**
     * Creates a new room with a unique ID and navigates to it.
     */
    function create() {
        // Generate a unique ID using the v1 version of UUID (Universally Unique Identifier).
        const id = uuid();

        // Use the history object to navigate to the newly created room.
        props.history.push(`/room/${id}`);
    }

    // Render a button that triggers the create function when clicked.
    return (
        <button onClick={create}>Create Room</button>
    );
}

export default CreateRoom;
