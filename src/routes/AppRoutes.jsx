import { Navigate, Route, Routes } from 'react-router-dom';
import HomePage from '../pages/HomePage.jsx';
import NotFoundPage from '../pages/NotFoundPage.jsx';
import SystemHubPage from '../pages/SystemHubPage.jsx';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/index.html" element={<Navigate to="/" replace />} />
      <Route path="/system-hub" element={<SystemHubPage />} />
      <Route
        path="/system-hub.html"
        element={<Navigate to="/system-hub" replace />}
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
