import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Goals from './pages/Goals';
import Subscriptions from './pages/Subscriptions';
import SplitExpenses from './pages/SplitExpenses';
import AnalyticsStudio from './pages/AnalyticsStudio';
import Reports from './pages/Reports';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import AIChatAssistant from './components/AIChatAssistant';

const ProtectedRoute = ({ children }) => {
  const { user } = useContext(AuthContext);
  return user ? children : <Navigate to="/login" replace />;
};

function App() {
  const { user } = useContext(AuthContext);

  return (
    <Router>
      <div className="app-container">
        {user && <Sidebar />}
        <div className="content-wrapper" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100vh', overflow: 'hidden' }}>
          {user && <Navbar />}
          <main className="main-content">
            <Routes>
              <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
              <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
              <Route path="/analytics" element={<ProtectedRoute><AnalyticsStudio /></ProtectedRoute>} />
              <Route path="/split-expenses" element={<ProtectedRoute><SplitExpenses /></ProtectedRoute>} />
              <Route path="/goals" element={<ProtectedRoute><Goals /></ProtectedRoute>} />
              <Route path="/subscriptions" element={<ProtectedRoute><Subscriptions /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            </Routes>
          </main>
        </div>
        {user && <AIChatAssistant />}
        <Analytics />
        <SpeedInsights />
      </div>
    </Router>
  );
}

export default App;
