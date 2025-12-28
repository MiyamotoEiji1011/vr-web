/* global skyway_room */
const { nowInSec, SkyWayAuthToken, SkyWayContext, SkyWayRoom, SkyWayStreamFactory } = skyway_room;

function createJti() {
  return globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : Math.random().toString(36).substring(2);
}

const token = new SkyWayAuthToken({
  jti: createJti(), iat: nowInSec(), exp: nowInSec() + 86400, version: 3,
  scope: { appId: "441577ac-312a-4ffb-aad5-e540d3876971", rooms: [{ name: "*", methods: ["create", "close", "updateMetadata"], member: { name: "*", methods: ["publish", "subscribe", "updateMetadata"] } }] },
}).encode("Bk9LR3lnRG483XKgUQAzCoP7tpLBhMs45muc9zDOoxE=");

const el = {
  connPill: document.getElementById("conn-pill"), myId: document.getElementById("my-id"),
  roomName: document.getElementById("room-name"), join: document.getElementById("join"), leave: document.getElementById("leave"),
  modeRadios: [...document.querySelectorAll('input[name="mode"]')],
  localVideo: document.getElementById("local-video"), remoteArea: document.getElementById("remote-media-area"),
  toggleVr: document.getElementById("toggle-vr"), uiRoot: document.getElementById("ui-root"), vrRoot: document.getElementById("vr-root"),
  exitVr: document.getElementById("exit-vr"), vrAssets: document.getElementById("vr-assets"), vrScreens: document.getElementById("vr-screens"),
  vrZ: document.getElementById("vr-z"), vrX: document.getElementById("vr-x"), vrZv: document.getElementById("vr-zv"), vrXv: document.getElementById("vr-xv"),
  autoSubscribe: document.getElementById("auto-subscribe"), vrVideoSelector: document.getElementById("vr-video-selector")
};

// VR State
const vrState = {
  enabled: false,
  currentPublicationId: null,
  videoSources: new Map() // ID -> videoElement
};

// VRメインスクリーン生成
const mainVrScreen = document.createElement("a-video");
mainVrScreen.setAttribute("id", "main-vr-screen");
mainVrScreen.setAttribute("width", "3.2");
mainVrScreen.setAttribute("height", "1.8");
el.vrScreens.appendChild(mainVrScreen);

function addOrUpdateVideoToVR(publicationId, videoEl) {
  if (!videoEl) return;
  videoEl.id = `vr-asset-${publicationId}`;
  el.vrAssets.appendChild(videoEl);
  vrState.videoSources.set(publicationId, videoEl);

  if (!vrState.currentPublicationId) switchVrVideo(publicationId);
  updateVrSwitcherUI();
}

function switchVrVideo(publicationId) {
  const videoEl = vrState.videoSources.get(publicationId);
  if (!videoEl) return;
  vrState.currentPublicationId = publicationId;
  mainVrScreen.setAttribute("src", `#${videoEl.id}`);
  updateVrSwitcherUI();
}

function removeVideoFromVR(publicationId) {
  vrState.videoSources.delete(publicationId);
  document.getElementById(`vr-asset-${publicationId}`)?.remove();
  if (vrState.currentPublicationId === publicationId) {
    vrState.currentPublicationId = null;
    const nextId = vrState.videoSources.keys().next().value;
    if (nextId) switchVrVideo(nextId);
    else mainVrScreen.setAttribute("src", "");
  }
  updateVrSwitcherUI();
}

function updateVrSwitcherUI() {
  el.vrVideoSelector.innerHTML = "";
  vrState.videoSources.forEach((_, id) => {
    const btn = document.createElement("button");
    btn.className = `btn small ${vrState.currentPublicationId === id ? 'primary' : ''}`;
    btn.textContent = id.substring(0, 6);
    btn.onclick = () => switchVrVideo(id);
    el.vrVideoSelector.appendChild(btn);
  });
}

function applyVrHudOffset() {
  const distance = parseFloat(el.vrZ.value);
  const scale = parseFloat(el.vrX.value);
  el.vrScreens.setAttribute("position", `0 0 -${distance}`);
  mainVrScreen.setAttribute("width", 2.0 * scale);
  mainVrScreen.setAttribute("height", 1.125 * scale);
  el.vrZv.textContent = distance.toFixed(1);
  el.vrXv.textContent = scale.toFixed(1);
}

// SkyWay Logic
let context, room, me, localAudio, localVideoStream;

el.join.onclick = async () => {
  const roomName = el.roomName.value.trim();
  if (!roomName) return;
  context = await SkyWayContext.Create(token);
  room = await SkyWayRoom.FindOrCreate(context, { name: roomName });
  me = await room.join();
  el.myId.textContent = me.id;
  el.connPill.className = "pill pill--on";
  el.join.disabled = true; el.leave.disabled = false;

  const handlePublication = async (pub) => {
    if (pub.publisher.id === me.id || pub.contentType !== "video") return;
    const { stream } = await me.subscribe(pub.id);
    const video = document.createElement("video");
    video.playsInline = true; video.autoplay = true;
    stream.attach(video);
    addOrUpdateVideoToVR(pub.id, video);
  };

  room.publications.forEach(handlePublication);
  room.onStreamPublished.add(e => handlePublication(e.publication));
  room.onStreamUnpublished.add(e => removeVideoFromVR(e.publication.id));
};

el.leave.onclick = () => location.reload();
el.toggleVr.onclick = () => {
  vrState.enabled = !vrState.enabled;
  document.querySelector('.vr-hud').style.display = vrState.enabled ? 'flex' : 'none';
};
el.exitVr.onclick = () => { vrState.enabled = false; document.querySelector('.vr-hud').style.display = 'none'; };

[el.vrZ, el.vrX].forEach(input => input.addEventListener("input", applyVrHudOffset));
applyVrHudOffset();