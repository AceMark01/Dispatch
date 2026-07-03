import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UploadReport from './pages/UploadReport';
import ApprovalPage from './pages/ApprovalPage';
import ApprovedPage from './pages/ApprovedPage';
import Setting from './pages/Setting';
import ProtectedRoute from './components/ProtectedRoute';
import RequireAccess, { HomeRedirect } from './components/RequireAccess';

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
            <Route index element={<HomeRedirect />} />
            <Route path="dashboard" element={<RequireAccess pageKey="Dashboard"><Dashboard /></RequireAccess>} />
            <Route path="upload" element={<RequireAccess pageKey="Upload"><UploadReport /></RequireAccess>} />
            <Route path="approval" element={<RequireAccess pageKey="Confirm order"><ApprovalPage /></RequireAccess>} />
            <Route path="approved" element={<RequireAccess pageKey="Approved"><ApprovedPage /></RequireAccess>} />
            <Route path="setting" element={<RequireAccess pageKey="Setting"><Setting /></RequireAccess>} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;