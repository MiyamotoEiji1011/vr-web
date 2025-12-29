/**
 * skyway.js
 * SkyWay関連の機能を管理
 */

/* global skyway_room, THREE */

// SkyWay設定
const SKYWAY_CONFIG = {
  ROOM_NAME: "room",
  APP_ID: "441577ac-312a-4ffb-aad5-e540d3876971",
  SECRET: "Bk9LR3lnRG483XKgUQAzCoP7tpLBhMs45muc9zDOoxE="
};

// SkyWay APIのインポート
const { nowInSec, SkyWayAuthToken, SkyWayContext, SkyWayRoom } = skyway_room;

/**
 * SkyWayマネージャークラス
 */
class SkyWayManager {
  constructor() {
    this.context = null;
    this.room = null;
    this.me = null;
  }

  /**
   * UUID (jti) の生成
   */
  createJti() {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * SkyWay認証トークンの生成
   */
  createToken() {
    return new SkyWayAuthToken({
      jti: this.createJti(),
      iat: nowInSec(),
      exp: nowInSec() + 60 * 60,
      version: 3,
      scope: {
        appId: SKYWAY_CONFIG.APP_ID,
        rooms: [
          {
            name: SKYWAY_CONFIG.ROOM_NAME,
            methods: ["create", "close", "updateMetadata"],
            member: { name: "*", methods: ["subscribe"] },
          },
        ],
      },
    }).encode(SKYWAY_CONFIG.SECRET);
  }

  /**
   * SkyWay接続の初期化
   */
  async initialize() {
    const token = this.createToken();
    this.context = await SkyWayContext.Create(token);
    return this.context;
  }

  /**
   * Roomへの接続
   */
  async joinRoom(roomName = SKYWAY_CONFIG.ROOM_NAME) {
    if (!this.context) {
      throw new Error("SkyWay context is not initialized. Call initialize() first.");
    }

    this.room = await SkyWayRoom.FindOrCreate(this.context, { name: roomName });
    this.me = await this.room.join();
    return { room: this.room, me: this.me };
  }

  /**
   * Publicationのサブスクライブ
   */
  async subscribe(publicationId) {
    if (!this.me) {
      throw new Error("Not joined to a room yet.");
    }
    return await this.me.subscribe(publicationId);
  }

  /**
   * ビデオストリームの購読と処理
   */
  async subscribeVideo(publication, videoElement, onReady) {
    if (publication.contentType !== "video") return;
    if (videoElement.srcObject) return; // 既に1本接続済み

    const { stream } = await this.subscribe(publication.id);
    stream.attach(videoElement);

    if (onReady) {
      const handleReady = () => {
        onReady();
        videoElement.removeEventListener("loadeddata", handleReady);
      };
      videoElement.addEventListener("loadeddata", handleReady);
    }
  }

  /**
   * Room内の全Publicationを処理
   */
  handlePublications(callback) {
    if (!this.room) {
      throw new Error("Not joined to a room yet.");
    }

    this.room.publications.forEach((p) => callback(p).catch(console.error));
    this.room.onStreamPublished.add((e) => {
      callback(e.publication).catch(console.error);
    });
  }

  /**
   * 接続のクリーンアップ
   */
  async cleanup() {
    try {
      await this.me?.leave();
      await this.room?.dispose();
    } finally {
      this.context = null;
      this.room = null;
      this.me = null;
    }
  }
}

/**
 * ビデオテクスチャをA-Frame planeにアタッチ
 */
function attachVideoTextureToPlane(videoEl, planeEl) {
  const mesh = planeEl.getObject3D("mesh");
  if (!mesh) {
    planeEl.addEventListener(
      "object3dset",
      () => attachVideoTextureToPlane(videoEl, planeEl),
      { once: true }
    );
    return;
  }

  const texture = new THREE.VideoTexture(videoEl);
  texture.needsUpdate = true;

  mesh.material.map = texture;
  mesh.material.color.set(0xffffff);
  mesh.material.needsUpdate = true;
}

// グローバルに公開
window.SkyWayManager = SkyWayManager;
window.attachVideoTextureToPlane = attachVideoTextureToPlane;
