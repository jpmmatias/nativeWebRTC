import React, {useRef, useEffect} from 'react';
import io, {Socket} from 'socket.io-client';

const Room = (props) => {
	const userVideo = useRef();
	const partnerVideo = useRef();
	const peerRef = useRef();
	const socketRef = useRef();
	const otherUser = useRef();
	const userStream = useRef();
	const senders = useRef([]);

	const handleICECandidateEvent = (e) => {
		if (e.candidate) {
			const payload = {
				target: otherUser.current,
				candidate: e.candidate,
			};
			socketRef.current.emit('ice-candidate', payload);
		}
	};

	const handleNewICECandidateMsg = (incoming) => {
		const candidate = new RTCIceCandidate(incoming);

		peerRef.current.addIceCandidate(candidate).catch((err) => console.log(err));
	};

	const handleTrackEvent = (e) => {
		partnerVideo.current.srcObject = e.streams[0];
	};

	const handleNegotiationNeededEvent = (userID) => {
		peerRef.current
			.createOffer()
			.then((offer) => {
				return peerRef.current.setLocalDescription(offer);
			})
			.then(() => {
				const payload = {
					target: userID,
					caller: socketRef.current.id,
					sdp: peerRef.current.localDescription,
				};
				socketRef.current.emit('offer', payload);
			})
			.catch((err) => console.log(err));
	};

	const createPeer = (userID) => {
		const peer = new RTCPeerConnection({
			iceServers: [
				{
					urls: 'stun:stun.stunprotocol.org',
				},
				{
					urls: 'turn:num.viagenie.ca',
					credential: 'muazkh',
					username: 'webrtc@live.com',
				},
			],
		});

		peer.onicecandidate = handleICECandidateEvent;
		peer.ontrack = handleTrackEvent;
		peer.onnegotiationneeded = () => handleNegotiationNeededEvent(userID);

		return peer;
	};

	const callUser = (userID) => {
		peerRef.current = createPeer(userID);
		userStream.current
			.getTracks()
			.forEach((track) =>
				senders.current.push(
					peerRef.current.addTrack(track, userStream.current)
				)
			);
	};

	const handleAnswer = (message) => {
		const desc = new RTCSessionDescription(message.sdp);
		peerRef.current.setRemoteDescription(desc).catch((e) => console.log(e));
	};

	const handleReciveCall = (incoming) => {
		peerRef.current = createPeer();
		const desc = new RTCSessionDescription(incoming.sdp);
		peerRef.current
			.setRemoteDescription(desc)
			.then(() => {
				userStream.current
					.getTracks()
					.forEach((track) =>
						peerRef.current.addTrack(track, userStream.current)
					);
			})
			.then(() => {
				return peerRef.current.createAnswer();
			})
			.then((answer) => {
				return peerRef.current.setLocalDescription(answer);
			})
			.then(() => {
				const payload = {
					target: incoming.caller,
					caller: socketRef.current.id,
					sdp: peerRef.current.localDescription,
				};
				socketRef.current.emit('answer', payload);
			});
	};

	const shareScreen = () => {
		navigator.mediaDevices.getDisplayMedia({cursor: true}).then((stream) => {
			const screenTrack = stream.getTracks()[0];
			senders.current
				.find((sender) => sender.track.kind === 'video')
				.replaceTrack(screenTrack);
			screenTrack.onended = () => {
				senders.current
					.find((sender) => sender.track.kind === 'video')
					.replaceTrack(userStream.current.getTracks()[1]);
			};
		});
	};

	useEffect(() => {
		navigator.mediaDevices
			.getUserMedia({audio: true, video: true})
			.then((stream) => {
				userVideo.current.srcObject = stream;
				userStream.current = stream;

				socketRef.current = io.connect('/');
				socketRef.current.emit('join room', props.match.params.roomID);

				socketRef.current.on('other user', (userID) => {
					callUser(userID);
					otherUser.current = userID;
				});

				socketRef.current.on('user joined', (userID) => {
					otherUser.current = userID;
				});

				socketRef.current.on('offer', handleReciveCall);

				socketRef.current.on('answer', handleAnswer);

				socketRef.current.on('ice-candidate', handleNewICECandidateMsg);
			});
	}, []);

	return (
		<div>
			<video
				muted={true}
				controls
				style={{height: 500, width: 500}}
				autoPlay
				ref={userVideo}
			></video>
			<video
				controls
				style={{height: 500, width: 500}}
				autoPlay
				ref={partnerVideo}
			></video>
			<button onClick={shareScreen}>Share Screen</button>
		</div>
	);
};

export default Room;
