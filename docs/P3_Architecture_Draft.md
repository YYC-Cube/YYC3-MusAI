# D-Music P3 Architecture Draft (Long-term Planning)

> Status: Draft v1.0
> Date: 2026-02-21
> Focus: Digital Album Distribution & End-to-End Encryption

---

## 1. Digital Album Distribution (数字专辑分发)

### 1.1 Overview
The Digital Album Distribution module enables creators to package, mint, and sell collections of music as digital assets. It moves beyond single-track playback to a collectible album format with ownership rights managed via the platform's ledger (simulated blockchain).

### 1.2 Core Components

#### A. Album Packaging System
*   **Structure**: Albums are collections of tracks + metadata + exclusive assets (cover art, booklet PDF, bonus stems).
*   **Data Model**:
    ```typescript
    interface Album {
      id: string;
      creatorId: string;
      title: string;
      coverUrl: string;
      tracks: string[]; // List of songIds
      price: number; // in Star Power
      limitedEdition: boolean;
      maxSupply?: number;
      circulatingSupply: number;
      releaseDate: number;
      exclusiveContent: {
        type: 'pdf' | 'stem' | 'video';
        url: string; // Encrypted URL
      }[];
    }
    ```
*   **Storage**: Heavy assets (PDFs, stems) stored in Supabase Storage buckets with strict RLS (Row Level Security) or private buckets accessed via short-lived signed URLs only for owners.

#### B. Ownership & Rights Management
*   **Ledger**: `kv_store` table `album:ownership:{albumId}:{userId}`.
*   **Validation**: Server verifies ownership before granting access to:
    1.  Full album playback (if premium).
    2.  Downloadable assets.
    3.  Resale rights (Secondary Market).

#### C. Distribution Channels
*   **Marketplace**: A dedicated section in the "Star Power Shop" or a new "Record Store" interface.
*   **Presale/Crowdfunding**: Users can pre-order albums using Star Power, unlocking exclusive "Early Bird" badges.

### 1.3 Technical Implementation Steps
1.  **Schema Design**: Define KV schema for Albums and Ownership.
2.  **Asset Management**: Create `make-f626b673-albums` private bucket.
3.  **Purchase Logic**: Transactional purchase flow (similar to Shop but with supply checks).
4.  **UI/UX**: Album view component, "My Collection" shelf, Audio player support for album playlists.

---

## 2. End-to-End Encryption (端到端加密)

### 2.1 Overview
To ensure privacy for Space-Time Capsules and Direct Messages (P3 features), we will implement E2EE. The server will only store encrypted blobs and will not have access to the user's private keys or message content.

### 2.2 Architecture

#### A. Key Management (Client-Side)
*   **Algorithm**: RSA-OAEP (2048-bit) for key exchange, AES-GCM (256-bit) for message content.
*   **Web Crypto API**: Use browser native `window.crypto.subtle`.
*   **Key Storage**:
    *   **Private Key**: Stored in `IndexedDB` (non-extractable if possible, or encrypted with a user-derived secret from their password/PIN). *Never leaves the device.*
    *   **Public Key**: Uploaded to Server KV `pki:public_keys:{userId}`.

#### B. Encryption Flow (Sending a Message)
1.  **Fetch**: Sender fetches Recipient's Public Key from Server.
2.  **Generate**: Sender generates a random AES session key.
3.  **Encrypt Content**: Encrypt message body with AES session key.
4.  **Encrypt Key**: Encrypt AES session key with Recipient's RSA Public Key.
5.  **Send**: Post `{ encryptedContent, encryptedSessionKey }` to server.

#### C. Decryption Flow (Receiving a Message)
1.  **Receive**: Client downloads encrypted payload.
2.  **Decrypt Key**: Use stored Private Key to decrypt the AES session key.
3.  **Decrypt Content**: Use AES session key to decrypt message body.
4.  **Display**: Show plaintext to user.

### 2.3 Challenges & Mitigations
*   **Key Loss**: If a user clears browser data, the Private Key is lost.
    *   *Mitigation*: "Key Backup" feature where the Private Key is encrypted with a strong recovery phrase and stored on the server (optional, opt-in).
*   **Multi-Device Sync**: Private keys are device-bound.
    *   *Mitigation*: Device linking protocol (scanning QR code from logged-in device to transfer keys securely via WebRTC or encrypted relay).

### 2.4 Technical Implementation Steps
1.  **Crypto Utils**: Create `src/app/lib/crypto.ts` wrapping Web Crypto API.
2.  **PKI API**: Server endpoints to upload/fetch public keys.
3.  **Schema Update**: Update `SpaceTime` message schema to support `content_encrypted` and `session_key_encrypted` fields.
4.  **UI Integration**: "Unlock" animations while decrypting; "Key Setup" wizard for new users.

---

## 3. Roadmap for P3

| Feature | Complexity | Dependency | Est. Timeline |
| :--- | :--- | :--- | :--- |
| **E2EE Infrastructure** | High | Web Crypto | Week 1-2 |
| **Private Capsules** | Medium | E2EE | Week 3 |
| **Album Schema & Storage** | Medium | Supabase Storage | Week 4 |
| **Album Marketplace** | High | Album Schema | Week 5-6 |
| **Secondary Market** | Very High | Marketplace | Week 7+ |
