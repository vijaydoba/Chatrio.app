// Random Video Chat controller — unlike videoChat.ts (which escalates an
// existing text match), a pairing here IS a video call: both sides create
// their peer connection and start signaling the moment they're matched, no
// invite/accept step. The local camera stream is acquired once by the page
// (before matching even starts) and reused across "next" clicks; this
// controller only owns the RTCPeerConnection for the current pairing, never
// the tracks themselves.
import { Socket } from "socket.io-client";

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
  ],
};

export type RandomVideoState = "connecting" | "active" | "off";
export type RandomVideoErrorReason = "connection_failed";

type Options = {
  socket: Socket;
  myId: string;
  partnerId: string;
  localStream: MediaStream;
  onRemoteStream: (stream: MediaStream | null) => void;
  onState: (state: RandomVideoState) => void;
  onError: (message: string, reason?: RandomVideoErrorReason) => void;
};

export type RandomVideoCallController = {
  teardown: () => void;
  handleSignal: (event: string, payload: any) => void;
};

export function createRandomVideoCall(opts: Options): RandomVideoCallController {
  const { socket, myId, partnerId, localStream, onRemoteStream, onState, onError } = opts;

  // Same fixed offer/answer role trick as videoChat.ts — deterministic from
  // the two socket ids both sides already know.
  const iAmOfferer = myId < partnerId;

  let pc: RTCPeerConnection | null = null;
  let pendingCandidates: RTCIceCandidateInit[] = [];
  let pendingOffer: RTCSessionDescriptionInit | null = null;
  let state: RandomVideoState = "off";

  function setState(next: RandomVideoState) {
    state = next;
    onState(next);
  }

  function createPeerConnection() {
    const conn = new RTCPeerConnection(ICE_SERVERS);
    localStream.getTracks().forEach((t) => conn.addTrack(t, localStream));
    conn.ontrack = (e) => onRemoteStream(e.streams[0] || null);
    conn.onicecandidate = (e) => {
      if (e.candidate) socket.emit("vc_ice_candidate", { candidate: e.candidate.toJSON() });
    };
    conn.onconnectionstatechange = () => {
      if (conn.connectionState === "connected") setState("active");
      if (conn.connectionState === "failed") {
        onError("Connection lost — finding someone new…", "connection_failed");
        socket.emit("vc_end", { reason: "connection_failed" });
        teardown();
      }
    };
    pc = conn;
  }

  async function flushCandidates() {
    if (!pc) return;
    for (const candidate of pendingCandidates) {
      await pc.addIceCandidate(candidate).catch(() => {});
    }
    pendingCandidates = [];
  }

  async function applyOffer(sdp: RTCSessionDescriptionInit) {
    if (!pc) return;
    await pc.setRemoteDescription(sdp);
    await flushCandidates();
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit("vc_answer", { sdp: answer });
  }

  async function start() {
    setState("connecting");
    createPeerConnection();
    if (iAmOfferer) {
      const offer = await pc!.createOffer();
      await pc!.setLocalDescription(offer);
      socket.emit("vc_offer", { sdp: offer });
    } else if (pendingOffer) {
      const sdp = pendingOffer;
      pendingOffer = null;
      await applyOffer(sdp);
    }
  }

  function teardown() {
    if (pc) {
      pc.close();
      pc = null;
    }
    pendingCandidates = [];
    pendingOffer = null;
    onRemoteStream(null);
    setState("off");
  }

  async function onOffer(sdp: RTCSessionDescriptionInit) {
    if (pc) await applyOffer(sdp);
    else pendingOffer = sdp;
  }

  async function onAnswer(sdp: RTCSessionDescriptionInit) {
    if (!pc) return;
    await pc.setRemoteDescription(sdp);
    await flushCandidates();
  }

  async function onIceCandidate(candidate: RTCIceCandidateInit) {
    if (pc && pc.remoteDescription) {
      await pc.addIceCandidate(candidate).catch(() => {});
    } else {
      pendingCandidates.push(candidate);
    }
  }

  function onEnd(reason?: string) {
    if (reason === "connection_failed") onError("They disconnected — finding someone new…", "connection_failed");
    teardown();
  }

  start();

  return {
    teardown,
    handleSignal(event: string, payload: any) {
      switch (event) {
        case "vc_offer":
          onOffer(payload.sdp);
          break;
        case "vc_answer":
          onAnswer(payload.sdp);
          break;
        case "vc_ice_candidate":
          onIceCandidate(payload.candidate);
          break;
        case "vc_end":
          onEnd(payload.reason);
          break;
      }
    },
  };
}
