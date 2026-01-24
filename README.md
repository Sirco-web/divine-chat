# Divine Chat

**Divine Chat** is a modern, minimalist web chat application that supports ephemeral private chat rooms and a global chat room, with real-time messaging powered by [Socket.IO](https://socket.io/). It is designed for easy deployment, flexible theming, and privacy-oriented, low-friction group chats.

## Features

- **Real-time Messaging:** Fast, persistent chat using websockets via Socket.IO.
- **Private Rooms:** Create and join rooms requiring a code and (optionally) a password.
- **Global Chat:** A single, ever-present room for anyone to join instantly.
- **Host Controls:** Owners can lock/unlock, clear, or reassign host role within a room.
- **Safe Rooms:** Enable "safe" mode to automatically close a room and disconnect all users when any participant reloads the page (great for pop-up discussions).
- **Theming:** Beautiful, animated UI with 12+ light/dark color themes and dynamic backgrounds.
- **Stickers:** Custom sticker grid for fun chat enhancements.
- **Markdown Support:** Format messages with Markdown (`marked` + `dompurify`).
- **Message Edit/Delete:** Edit (once, within 60s) or delete your own messages. Hosts can also delete any message.
- **User Avatars:** Initials based on username.
- **Host Reassignment:** Seamless host handoff in case the original host leaves.
- **Ephemeral/Persistent History:** Message history per room (capped at 100), persisted on disk if enabled.
- **Accessibility:** Keyboard support, clear focus indicators, ARIA roles, reduced motion.
- **Mobile-Friendly:** Fully responsive layout.

## Project Structure

The repository is organized as follows:

```
divine-chat/
│
├── public/
│   ├── assets/
│   │   └── stickers/     # Sticker images and index.json
│   ├── css/
│   │   └── styles.css    # All frontend styles and themes
│   ├── js/
│   │   └── main.js       # Main browser-side JS (all chat logic)
│   ├── index.html        # Main frontend page
│   └── ...               # Other static files (favicon, etc.)
│
├── data/
│   └── chat-state.json   # (Created at runtime) - persisted chat state if disk persistence enabled
│
├── server.js             # Main Node.js server, including Socket.IO logic
├── package.json
├── README.md
└── ...                   # (other config or lock files)
```

**Folders in Divine Chat:**

- `public/` – All static assets served to the browser (HTML, CSS, JS, images, stickers).
    - `public/assets/stickers/` – Sticker images and `index.json` for sticker manifest.
    - `public/css/` – CSS stylesheets (main theme definitions and UI components).
    - `public/js/` – Main client-side JavaScript.
- `data/` – (Optional, auto-created) for persistent room/message state on disk. (Configured with `PERSIST_PATH`)
- *(No explicit `src/` folder; all backend logic is in `server.js`)*
- *(No build step required; everything runs as-is with Node.js)*

## Requirements

- **Node.js** (v14+ recommended)
- **npm**
- No database required. Persistence is file-based and optional.

## Getting Started

### 1. Clone and Install Dependencies

```bash
git clone https://github.com/divine-is-cool/divine-chat.git
cd divine-chat
npm install
```

### 2. Run the Server

```bash
npm start
# Or specify a port and/or a persistence path:
PORT=4000 PERSIST_PATH=./data/chat-state.json npm start
```

### 3. Access Divine Chat

Open your browser and navigate to:

```
http://localhost:3000/
# Or your configured port
```

### 4. Usage

- **Create Room**: Choose a username and enter a room code (and password if desired).
- **Join Room**: Join with a code/password and unique username.
- **Global Chat**: Join instantly with a username.
- **Reassign Host / Lock / Clear**: Only the "Host" user (creator or reassigned) can use these controls in private rooms.
- **Safe Room**: If enabled, rooms are destroyed when a user reloads (great for ephemeral chats).

## Configuration

### Environment Variables

- `PORT` — Port number to listen on (default: `3000`).
- `PERSIST_PATH` — Path to store persistent chat state (default: `./data/chat-state.json`).
- `PERSIST_INTERVAL_MS` — How often (ms) to auto-save chat state (default: `15000`).
- `PERSIST_DEBOUNCE_MS` — Debounce time before saving on changes (default: `2000`).

### Stickers

To add or change stickers, update `public/assets/stickers/` and its `index.json`.

## Security and Privacy

Divine Chat aims for privacy and ease of use:

- Room messages and user tokens are stored only on disk if persistence is enabled.
- Room passwords are securely hashed with bcryptjs.
- Markdown and all user input are sanitized with DOMPurify before rendering.
- Room access is token-based for editing/deleting messages and for locked room rejoin.

## Customization

- **Themes:** Easily modify, add, or swap out color themes in `public/css/styles.css`.
- **Stickers:** Add images in `public/assets/stickers/`, update `index.json`.
- **UI/Branding:** Update `public/index.html` and CSS for site text and layout tweaks.

## Deployment

This app runs on Node.js as a single process. For production:

1. Use a process manager such as [PM2](https://pm2.keymetrics.io/), or Docker.
2. Place behind a secure, HTTPS-enabled reverse proxy (e.g., nginx, Caddy).
3. Backup/secure your persistence file (if enabled).

## License

Divine Universal License Agreement. See [LICENSE](LICENSE.md) for details.

## Credits

Created by divine, led by [glitchandgo](https://github.com/glitchandgo) and other team members.

- Socket.IO
- Express
- bcryptjs
- marked.js, DOMPurify (frontend)
- Design inspiration: Discord, Slack, and late-night study chat!

---

**Enjoy chatting! ✨**
