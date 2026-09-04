# Downly — Fast Social Media Media Downloader

Downly is a production-quality, responsive web application for analyzing publicly accessible social media links (Instagram Posts, Instagram Reels, YouTube Videos, YouTube Shorts) and streaming available media in HD video and audio formats.

Built with **Apple-level simplicity**, **modern SaaS aesthetics**, and **security-first architecture**.

![Downly Architecture](public/favicon.svg)

---

## 🌟 Key Features

- **Multi-Platform Support**: Instagram Posts, Instagram Reels, YouTube Videos, YouTube Shorts.
- **Dynamic Quality Selection**: 4K Ultra HD (2160p), 1440p 2K, 1080p Full HD, 720p HD, 480p, 360p (only formats returned by backend).
- **Audio Extraction**: M4A and MP3 standalone audio format options when available.
- **Signed Download Token System**: Short-lived HMAC signed tokens for secure stream delivery.
- **SSRF Protection & Domain Allowlisting**: Server-side validation rejecting private IPs, localhost, file:// schemes, and unauthorized domains.
- **Rate Limiting & Abuse Prevention**: Configurable rate limiters for analyze, download token, and media streaming endpoints.
- **Automatic Temp Storage Cleanup**: Temporary streaming files automatically expire and are purged after 5 minutes.
- **Dark/Light Mode**: Charcoal SaaS dark mode by default with instant toggle switch and local persistence.
- **Responsive & Accessible**: Mobile-first single column layout scaling seamlessly to desktop resolutions (320px – 1920px).

---

## 🚀 Tech Stack

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS 3 + Custom CSS Tokens (Glassmorphic surfaces, shimmers, micro-animations)
- **Icons**: Lucide React

### Backend
- **Runtime**: Node.js + TypeScript
- **Framework**: Express 4
- **Security**: Helmet, CORS, Express Rate Limit, HMAC SHA-256 Tokens
- **Architecture**: Modular Provider Pattern (`MediaProvider`, `YouTubeProvider`, `InstagramProvider`, `ProviderRegistry`)

---

## 🛠️ Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### Installation

1. **Clone & Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

3. **Start Development Servers (Frontend + API)**:
   ```bash
   npm run dev:all
   ```
   - Frontend will run on `http://localhost:3000`
   - Backend API will run on `http://localhost:5000`

---

## 📖 API Endpoints

### 1. Analyze Media URL
`POST /api/analyze`

**Request Body**:
```json
{
  "url": "https://www.youtube.com/watch?v=EXAMPLE_ID"
}
```

**Response**:
```json
{
  "success": true,
  "media": {
    "id": "EXAMPLE_ID",
    "platform": "youtube",
    "type": "video",
    "title": "Sample Video Title",
    "creator": "Channel Name",
    "thumbnail": "https://...",
    "duration": 320,
    "formattedDuration": "05:20",
    "originalUrl": "https://www.youtube.com/watch?v=EXAMPLE_ID",
    "formats": [
      {
        "id": "yt-EXAMPLE_ID-1080p",
        "type": "video",
        "container": "mp4",
        "quality": "1080p • Full HD",
        "resolution": "1920x1080",
        "available": true,
        "recommended": true
      }
    ],
    "audioFormats": [
      {
        "id": "yt-EXAMPLE_ID-audio-m4a",
        "type": "audio",
        "container": "m4a",
        "bitrate": "Original Quality",
        "available": true
      }
    ]
  }
}
```

### 2. Create Short-Lived Download Token
`POST /api/download/token`

**Request Body**:
```json
{
  "mediaId": "EXAMPLE_ID",
  "formatId": "yt-EXAMPLE_ID-1080p",
  "platform": "youtube",
  "originalUrl": "https://www.youtube.com/watch?v=EXAMPLE_ID"
}
```

**Response**:
```json
{
  "success": true,
  "token": "eyJhbG...signature",
  "expiresIn": 300,
  "streamUrl": "/api/stream/eyJhbG...signature"
}
```

### 3. Stream Media File
`GET /api/stream/:token`

Streams binary content with `Content-Disposition: attachment` headers.

---

## 🔒 Security & Compliance

- **No DRM or Paywall Circumvention**: Downly only processes publicly accessible media.
- **SSRF & Private IP Filter**: Reject internal hostnames, 127.0.0.1, 10.x.x.x, 192.168.x.x, and non-http schemes.
- **Sanitized Errors**: Internal stack traces are logged on the server only. Clients receive friendly error responses (`INVALID_URL`, `PRIVATE_CONTENT`, `RATE_LIMITED`).

---

## 📄 License & Responsible Use

Downly is provided for lawful use with content that users are authorized to access. Respect platform Terms of Service and applicable intellectual property laws.
