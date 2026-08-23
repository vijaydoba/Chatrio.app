// Video chat for the main random-chat pairing. Pure client-side peer
// connection management; signaling travels over the same socket the text
// chat already uses. Each new pairing gets a fresh controller instance
// (created in Chat.tsx on partner_found, torn down on friend_left/next/leave).
import { Socket } from "socket.io-client";

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
  ],
};

export type VideoState = "off" | "inviting" | "incoming" | "active";
export type VideoErrorReason = "permission_denied" | "no_device" | "declined" | "connection_failed";

type Options = {
  socket: Socket;
  myId: string;
  partnerId: string;
  onLocalStream: (stream: MediaStream | null) => void;
  onRemoteStream: (stream: MediaStream | null) => void;
  onState: (state: VideoState) => void;
  onError: (message: string, reason?: VideoErrorReason) => void;
};

export type VideoCallController = {
  invite: () => void;
  accept: () => void;
  decline: () => void;
  cancel: () => void;
  hangUp: () => void;
  teardown: () => void;
  handleSignal: (event: string, payload: any) => void;
};

export function createVideoCall(opts: Options): VideoCallController {
  const { socket, myId, partnerId, onLocalStream, onRemoteStream, onState, onError } = opts;

  // Fixed offer/answer role, decided once per pairing from the two socket
  // ids both sides already know — avoids full perfect-negotiation for a
  // 1:1, single-call-at-a-time feature.
  const iAmOfferer = myId < partnerId;

  let pc: RTCPeerConnection | null = null;
  let localStream: MediaStream | null = null;
  let pendingCandidates: RTCIceCandidateInit[] = [];
  let pendingOffer: RTCSessionDescriptionInit | null = null;
  let state: VideoState = "off";

  function setState(next: VideoState) {
    state = next;
    onState(next);
  }

  async function getMedia(): Promise<MediaStream | null> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStream = stream;
      onLocalStream(stream);
      return stream;
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotFoundError" || name === "OverconstrainedError") {
        onError("No camera or microphone found on this device.", "no_device");
      } else {
        onError("Camera/mic access is needed for video — you can keep chatting by text.", "permission_denied");
      }
      return null;
    }
  }

  function createPeerConnection(stream: MediaStream) {
    const conn = new RTCPeerConnection(ICE_SERVERS);
    stream.getTracks().forEach((t) => conn.addTrack(t, stream));
    conn.ontrack = (e) => onRemoteStream(e.streams[0] || null);
    conn.onicecandidate = (e) => {
      if (e.candidate) socket.emit("video_ice_candidate", { candidate: e.candidate.toJSON() });
    };
    conn.onconnectionstatechange = () => {
      if (conn.connectionState === "failed") {
        onError("Couldn't connect — you can keep chatting by text.", "connection_failed");
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

  async function startAsOfferer() {
    if (!pc) return;
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("video_offer", { sdp: offer });
  }

  async function applyOffer(sdp: RTCSessionDescriptionInit) {
    if (!pc) return;
    await pc.setRemoteDescription(sdp);
    await flushCandidates();
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit("video_answer", { sdp: answer });
  }

  // Shared by the callee's explicit accept and the caller's "they accepted"
  // confirmation. Idempotent so glare (both sides accepting near-simultaneously)
  // can't create a second peer connection.
  async function beginCall(emitAcceptFirst: boolean) {
    if (pc || state === "active") return;
    const attemptState = state;
    const stream = await getMedia();
    // The other side may cancel/decline/end the call, or the pair may break
    // up (skip/disconnect), while the browser's permission prompt is still
    // pending — getUserMedia can take arbitrarily long.
    if (state !== attemptState) {
      stream?.getTracks().forEach((t) => t.stop());
      if (stream) onLocalStream(null);
      return;
    }
    if (!stream) {
      socket.emit(emitAcceptFirst ? "video_decline" : "video_end", { reason: "permission_denied" });
      setState("off");
      return;
    }
    if (emitAcceptFirst) socket.emit("video_accept", {});
    createPeerConnection(stream);
    setState("active");
    if (iAmOfferer) {
      await startAsOfferer();
    } else if (pendingOffer) {
      const sdp = pendingOffer;
      pendingOffer = null;
      await applyOffer(sdp);
    }
  }

  function invite() {
    if (state !== "off") return;
    setState("inviting");
    socket.emit("video_invite", {});
  }

  function cancel() {
    if (state !== "inviting") return;
    socket.emit("video_cancel", {});
    setState("off");
  }

  function decline() {
    if (state !== "incoming") return;
    socket.emit("video_decline", { reason: "declined" });
    setState("off");
  }

  function accept() {
    if (state !== "incoming") return;
    beginCall(true);
  }

  function hangUp() {
    if (state === "off") return;
    if (state === "active") socket.emit("video_end", { reason: "hangup" });
    else if (state === "inviting") socket.emit("video_cancel", {});
    else if (state === "incoming") socket.emit("video_decline", { reason: "declined" });
    teardown();
  }

  function teardown() {
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
      localStream = null;
    }
    if (pc) {
      pc.getSenders().forEach((s) => s.track && s.track.stop());
      pc.close();
      pc = null;
    }
    pendingCandidates = [];
    pendingOffer = null;
    onLocalStream(null);
    onRemoteStream(null);
    setState("off");
  }

  function onVideoInvite() {
    if (state === "inviting") {
      // Both sides tapped "start video" near-simultaneously — treat as mutual accept.
      beginCall(true);
      return;
    }
    setState("incoming");
  }

  function onVideoAccept() {
    beginCall(false);
  }

  function onVideoDecline() {
    onError("They declined the video call.", "declined");
    setState("off");
  }

  function onVideoCancel() {
    if (state === "incoming") setState("off");
  }

  async function onVideoOffer(sdp: RTCSessionDescriptionInit) {
    if (pc) {
      await applyOffer(sdp);
    } else {
      pendingOffer = sdp;
    }
  }

  async function onVideoAnswer(sdp: RTCSessionDescriptionInit) {
    if (!pc) return;
    await pc.setRemoteDescription(sdp);
    await flushCandidates();
  }

  async function onVideoIceCandidate(candidate: RTCIceCandidateInit) {
    if (pc && pc.remoteDescription) {
      await pc.addIceCandidate(candidate).catch(() => {});
    } else {
      pendingCandidates.push(candidate);
    }
  }

  function onVideoEnd(reason?: string) {
    if (reason === "permission_denied") onError("They couldn't access their camera or microphone.", "permission_denied");
    else if (reason === "connection_failed") onError("Video call disconnected.", "connection_failed");
    teardown();
  }

  return {
    invite,
    accept,
    decline,
    cancel,
    hangUp,
    teardown,
    handleSignal(event: string, payload: any) {
      switch (event) {
        case "video_invite":
          onVideoInvite();
          break;
        case "video_accept":
          onVideoAccept();
          break;
        case "video_decline":
          onVideoDecline();
          break;
        case "video_cancel":
          onVideoCancel();
          break;
        case "video_offer":
          onVideoOffer(payload.sdp);
          break;
        case "video_answer":
          onVideoAnswer(payload.sdp);
          break;
        case "video_ice_candidate":
          onVideoIceCandidate(payload.candidate);
          break;
        case "video_end":
          onVideoEnd(payload.reason);
          break;
      }
    },
  };
}
