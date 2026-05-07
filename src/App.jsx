import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UploadReport from './pages/UploadReport';
import ApprovalPage from './pages/ApprovalPage';
import ConfirmPage from './pages/ConfirmPage';
import DispatchPage from './pages/DispatchPage';
import Setting from './pages/Setting';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <div className="h-[100dvh] w-full overflow-hidden">
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="upload" element={<UploadReport />} />
            <Route path="approval" element={<ApprovalPage />} />
            <Route path="confirm" element={<ConfirmPage />} />
            <Route path="dispatch" element={<DispatchPage />} />
            <Route path="setting" element={<Setting />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;