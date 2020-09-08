import React from 'react';
import {v1 as uuid} from 'uuid';
const CreateRoom = ({history}) => {
	const create = () => {
		const id = uuid();
		history.push(`/room/${id}`);
	};
	return <button onClick={create}>Create Room</button>;
};

export default CreateRoom;
