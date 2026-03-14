# GridToGround
GridToGround is a powerful AI-driven application that transforms 2D floor plans into immersive 3D visualizations. Built with React Router and powered by Google's Gemini models via Puter.js, it provides architects, designers, and homeowners with a seamless way to visualize spaces from a simple blueprint.

## 🚀 Features

- **AI Blueprint Analysis**: High-precision detection of walls, doors, and rooms from images.
- **3D Visualization**: Interactive 3D scene generation using Three.js based on AI-extracted layouts.
- **Before & After Comparison**: Smooth slider view to compare the original floor plan with the generated 3D render.
- **Cloud Hosting & Storage**: Powered by Puter.js for secure data management and authentication.
- **Modern UI**: A premium, neobrutalist-inspired design for a superior user experience.

## 🛠️ Getting Started

### Prerequisites

- Node.js (v18+)
- A [Puter.com](https://puter.com) account for AI and storage services.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Dhilipkumar-max/GridToGround.git
   cd GridToGround
   ```

2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

Open [http://localhost:5173](http://localhost:5173) to see the application in action.

## 🏗️ Architecture

The project follows a modern full-stack architecture:
- **Frontend**: React (React Router v7) for a snappy, server-rendered experience.
- **AI Engine**: Gemini 2.5 Flash for image-to-text (layout) and Gemini 2.5 Flash Image Preview for text-to-image (3D view).
- **3D Engine**: Three.js for rendering the interactive environment.
- **Backend/Platform**: Puter.js for authentication, hosting, and persistent storage.

For a deeper dive, check out [ARCHITECTURE.md](./ARCHITECTURE.md).

## 🧰 Tech Stack

See [TECH_STACK.md](./TECH_STACK.md) for a full list of technologies and libraries used.

---

## License 

MIT

---

Built with ❤️ by the GridToGround Team.
