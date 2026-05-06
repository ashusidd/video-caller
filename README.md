# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

      
      
      
                                     V-CALL HD — Next-Gen WebRTC Experience
                                         Version 1.0 (2026 Edition)

V-CALL HD ek high-performance video calling application hai jo WebRTC aur PeerJS ka use karke real-time, low-latency communication provide karti hai. Is project ko Vite + React ke saath optimize kiya gaya hai taaki "Zero-Blink" user experience mil sake.

                                          Key Features


HD Video & Audio: Peer-to-peer communication using PeerJS for crystal clear quality.

Signaling Bridge (Firestore): Background call detection logic jo app band hone par bhi incoming signals ko capture karta hai.

Instant Presence System: Firebase Real-time Database (RTDB) ka use karke "Online/Offline" status ka instant reflection.

Mute/Unmute Sync: Advanced WebRTC getSenders() implementation jo dono taraf audio/video tracks ko perfectly sync rakhta hai.

Anti-Blink Onboarding: A smart loading shield jo database fetch hone tak onboarding screen ko "flash" hone se rokta hai.

Framer Motion UI: Smooth transitions aur modern aesthetic animations.

🛠️ Tech Stack
Frontend: React.js (Vite), Tailwind CSS, Framer Motion

P2P Connection: PeerJS (WebRTC)

Backend/Database: Firebase (Firestore, RTDB, Cloud Messaging)

Authentication: Firebase Auth