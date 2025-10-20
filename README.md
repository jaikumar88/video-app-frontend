# Video Calling App - Frontend

A modern React-based video calling platform with real-time communication features.

## 🚀 Features

- **Video Calling**: WebRTC-powered video and audio communication
- **Real-time Chat**: Instant messaging during video calls
- **User Authentication**: Secure login and registration system
- **Meeting Management**: Create, join, and manage video meetings
- **Admin Dashboard**: Administrative controls and user management
- **Responsive Design**: Mobile-friendly interface using Material-UI

## 🛠 Tech Stack

- **Frontend**: React 18, TypeScript
- **UI Library**: Material-UI (MUI)
- **State Management**: Redux Toolkit
- **Routing**: React Router v6
- **Real-time Communication**: Socket.io, WebRTC
- **HTTP Client**: Axios
- **Build Tool**: Create React App

## 🏃‍♂️ Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/video-app-frontend.git
cd video-app-frontend
```

2. Install dependencies:
```bash
npm install --legacy-peer-deps
```

3. Set up environment variables:
```bash
# Create .env file and configure:
REACT_APP_API_URL=https://your-backend-url.com/api/v1
REACT_APP_WS_URL=wss://your-backend-url.com/ws
```

4. Start the development server:
```bash
npm start
```

The app will be available at `http://localhost:3000`

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Layout/         # Layout components
│   ├── MeetingRoom.tsx # Video meeting interface
│   └── ...
├── pages/              # Page components
│   ├── HomePage.tsx    # Landing page
│   ├── LoginPage.tsx   # Authentication
│   ├── MeetingPage.tsx # Meeting room
│   └── ...
├── services/           # API and external services
│   ├── api.ts          # API client
│   ├── WebRTCService.ts # WebRTC handling
│   └── WebSocketService.ts # Real-time communication
├── store/              # Redux store and slices
│   ├── slices/         # Redux slices
│   └── store.ts        # Store configuration
└── App.tsx             # Main app component
```

## 🚀 Deployment

### GitHub Pages

1. Update the homepage URL in `package.json`:
```json
"homepage": "https://YOUR_GITHUB_USERNAME.github.io/video-app-frontend"
```

2. Build and deploy:
```bash
npm run build
npm run deploy
```

## 🔧 Available Scripts

- `npm start` - Start development server
- `npm run build` - Build for production
- `npm run test` - Run tests
- `npm run deploy` - Deploy to GitHub Pages
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## 🌐 Backend Integration

This frontend is designed to work with the video calling backend API. Make sure to:

1. Configure the correct API endpoints in your `.env` file
2. Ensure CORS is properly configured on your backend
3. Set up WebSocket connections for real-time features

## 📝 Environment Variables

Create a `.env` file in the root directory:

```env
# API Configuration
REACT_APP_API_URL=https://your-backend-url.com/api/v1
REACT_APP_WS_URL=wss://your-backend-url.com/ws

# Optional: For development with ngrok
# REACT_APP_API_URL=https://your-ngrok-url.ngrok-free.dev/api/v1
# REACT_APP_WS_URL=wss://your-ngrok-url.ngrok-free.dev/ws
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🐛 Known Issues

- Some peer dependency warnings during installation (use `--legacy-peer-deps`)
- Environment variables need manual configuration for different deployment environments

## 📞 Support

For support, please open an issue on GitHub or contact the development team.

---

Built with ❤️ using React and modern web technologies.
