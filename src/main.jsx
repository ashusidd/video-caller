import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import { VideoProvider } from './context/VideoContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  // Yahan se <React.StrictMode> hata diya hai
  <AuthProvider>
    <VideoProvider>
      <App />
    </VideoProvider>
  </AuthProvider>
);