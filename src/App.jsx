import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import SignUp from './pages/SignUp';
import SignIn from './pages/SignIn';
import IntakeForm from './pages/IntakeForm';
import AdminDashboard from './pages/AdminDashboard';
import SessionDetail from './pages/SessionDetail';
import ForgotPassword from './pages/ForgotPassword';

function AdminRoute({ children }) {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  if (!token) return <Navigate to="/login" replace />;
  if (role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

// The form is open to: logged-in users, guests who tapped "continue without
// signing up", and returning guests with a saved profile. Brand-new visitors
// see the welcome (sign in) page first.
function FormGate({ children }) {
  const token = localStorage.getItem('token');
  const guest = localStorage.getItem('guest_ok');
  const savedProfile = localStorage.getItem('profile_id');
  if (!token && !guest && !savedProfile) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/signup" element={<SignUp />} />
        <Route path="/login"  element={<SignIn />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/" element={
          <FormGate><IntakeForm /></FormGate>
        } />
        <Route path="/admin" element={
          <AdminRoute><AdminDashboard /></AdminRoute>
        } />
        <Route path="/admin/sessions/:id" element={
          <AdminRoute><SessionDetail /></AdminRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
