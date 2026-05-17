import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './Dashboard';
import AdminPage from './AdminPage';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/pd" element={<AdminPage role="pd" />} />
      <Route path="/qc" element={<AdminPage role="qc" />} />
      <Route path="/qa" element={<AdminPage role="qa" />} />
    </Routes>
  </BrowserRouter>
);
