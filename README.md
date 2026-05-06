# JARVIS—I · Neural MindSpace

> *"What if your mind had a home you could walk inside?"*

**JARVIS-I** is an AI-powered 3D neural productivity universe built for people with ADHD and anyone who needs to see their mind laid out before they can engage with it. Instead of lists and checkboxes, your goals live as glowing neural nodes inside a breathing 3D brain — a living map of who you are and what you're becoming.

---

## What is this?

Most productivity apps are just lists with different clothing. JARVIS-I is something different.

You enter a neural universe — a 3D brain that rotates in deep space. Inside it, your goals and interests exist as **neural nodes** — glowing, pulsing points of light with dendrite arms, each one representing a domain of your life you're working on. You can fly *inside* the brain, watch synapses fire in real time, and talk to JARVIS — an AI that understands your entire mindspace and helps you build structured plans from your goals.

It was built as a final year diploma project by someone with ADHD, for people like themselves.

---

## Live Demo

| Service | URL |
|---|---|
| 🧠 Frontend | [jarvis-i.vercel.app](https://jarvis-i.vercel.app) |
| ⚙️ Backend | Hosted on Render |
| 🗄️ Database | MongoDB Atlas |

---

## Features

### 🧠 3D Neural Brain
- Real-time WebGL brain visualization built with Three.js
- Glowing point-network with curved surface connections
- Internal synapse network that fires independently
- Smooth camera fly — enter and exit the brain
- Bloom post-processing for atmospheric glow
- Auto-rotating outside, explorable inside

### ✦ Neural Thought Nodes
- Each node represents a domain of your life — a skill, a goal, a passion
- Nodes glow based on how recently you visited them (vitality system)
- Dendrite arms radiate from each node like real neurons
- Progress ring shows mastery level
- Nodes pulse and breathe in real time

### ◈ JARVIS AI Assistant
- Powered by Google Gemini 2.5 Flash
- Understands your full mindspace — all nodes, progress, neglected areas
- Generates structured milestone and task plans from a single goal description
- Gives ADHD-aware advice — one clear next step, never overwhelming
- Full conversation interface inside the app

### 📋 Milestone & Task System
- Milestones are free — no forced linear order
- Tasks have difficulty weights: Easy (1pt), Medium (2pts), Hard (3pts)
- Progress auto-calculates from weighted task completion
- Deadline tracking with overdue alerts
- Prerequisite tagging for tasks that must come first
- Time tracking — logs minutes spent on each node

### 🎵 Tibetan Meditative Audio
- 5 original ambient tracks synthesized with Web Audio API
- OM Drone, Heart Bowl, Crown Chakra, Deep Silence, Chakra Flow
- No audio files — pure mathematical sound synthesis
- Volume control and track switching

### 🎙️ Voice Welcome
- JARVIS speaks your name when you enter the MindSpace
- Calm, meditative 4-phrase welcome sequence
- Browser TTS with female British voice

### 📚 Resources Tab
- Attach links, books, videos, notes to any node
- Auto-detects links vs documents vs notes

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React.js | UI framework |
| Three.js | 3D brain visualization |
| OrbitControls | Camera interaction |
| EffectComposer + UnrealBloomPass | Glow post-processing |
| Web Audio API | Tibetan sound synthesis |
| Web Speech API | Voice welcome |
| Axios | API communication |

### Backend
| Technology | Purpose |
|---|---|
| Node.js + Express | REST API server |
| MongoDB + Mongoose | Database |
| JWT | Authentication |
| Google Gemini API | AI chat and milestone generation |
| ElevenLabs API | Voice synthesis (paid tier) |

---

## Project Structure

```
jarvis-i/
├── frontend/
│   ├── public/
│   │   └── brain/
│   │       └── brain_data.json     ← 3D brain point network
│   └── src/
│       ├── pages/
│       │   ├── MindSpace.js        ← Main 3D experience
│       │   ├── Login.js
│       │   └── Register.js
│       ├── context/
│       │   └── AuthContext.js
│       └── App.js
└── backend/
    ├── routes/
    │   ├── auth.js                 ← Login / Register
    │   ├── nodes.js                ← CRUD for neural nodes
    │   └── jarvis.js               ← AI chat, suggest, voice
    ├── models/
    │   └── Node.js                 ← Milestone/task schema
    ├── middleware/
    │   └── auth.js                 ← JWT verification
    └── server.js
```

---

## Getting Started

### Prerequisites
- Node.js v18+
- MongoDB Atlas account
- Google Gemini API key
- ElevenLabs API key (optional — for AI voice)

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/jarvis-i.git
cd jarvis-i
```

### 2. Setup Backend

```bash
cd backend
npm install
```

Create `backend/.env`:
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
GEMINI_API_KEY=your_gemini_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key
```

Start backend:
```bash
npm run dev
```

### 3. Setup Frontend

```bash
cd frontend
npm install
npm start
```

Open `http://localhost:3000`

---

## How It Works

### Entering the MindSpace
When you open JARVIS-I, you see a glowing neural brain rotating in deep space. Your thought nodes float inside it like stars. Double-click or press **ENTER BRAIN** to fly inside the brain — the camera smoothly transitions from outside to inside, and the brain becomes a shell around you, your nodes floating in the space you now inhabit.

### Creating a Node
Single-click on the empty space outside the brain to spawn a new neural node. Name it anything — a skill you're learning, a project you're building, a part of yourself you want to nurture.

### Setting a Goal
Open any node and write a specific goal. Not "learn programming" but "build a REST API with Node.js and deploy it in 4 weeks." Then ask JARVIS to generate a plan — it reads your goal and creates structured milestones and tasks automatically.

### Node Vitality
Every node has a vitality score. It glows brightly when you visit it regularly and dims when neglected — a gentle visual reminder that certain parts of your mind need attention. No judgment, just light.

---

## The Philosophy

> Standard productivity tools put your tasks in a list.  
> JARVIS-I puts your mind in a universe.

This project was built on the belief that people with ADHD don't struggle because they lack discipline — they struggle because their internal world is invisible to them. When you can see your mind, you can navigate it.

JARVIS-I makes the invisible visible.

---

## Screenshots

> *Coming soon — screenshots and demo video*

---

## Author

**Khadiza Akter**  
Diploma in Engineering — Final Year Project  
Built with ❤️ over many long nights

---

## Acknowledgements

- Google Gemini for the AI backbone
- Three.js community for WebGL tooling
- Anthropic Claude for development assistance
- Every person with ADHD who inspired this project

---

## License

MIT License — free to use, modify, and build upon.

---

*JARVIS—I · Your mind, made visible.*
