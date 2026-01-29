import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

// Context
import { AuthProvider } from './context/AuthContext';

// Components
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute';
import Layout from './layouts/Layout';

// Auth Pages
import { Login, Register, ForgotPassword, ResetPassword, Unauthorized } from './pages/auth';

// Order Pages
import { OrdersList, OrderDetails, OrderNew, OrderEdit } from './pages/orders';

// Common Pages
import { NotFound } from './pages/common';

// User Pages
import Profile from './pages/Profile';

// Admin Pages
import { AdminDashboard, UserManagement, OrderManagement, ApplicationManagement } from './pages/admin';

function App() {
  return (
    <AuthProvider>
      <Router>
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          pauseOnHover
        />
        <Routes>
          {/* Public Routes (redirect if logged in) */}
          <Route path="/login" element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } />
          <Route path="/register" element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          } />
          <Route path="/forgot-password" element={
            <PublicRoute>
              <ForgotPassword />
            </PublicRoute>
          } />
          <Route path="/reset-password/:token" element={
            <PublicRoute>
              <ResetPassword />
            </PublicRoute>
          } />

          {/* Protected Routes (require login) */}
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/orders" />} />

            <Route path="/orders" element={
              <ProtectedRoute>
                <OrdersList />
              </ProtectedRoute>
            } />

            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />

            <Route path="/orders/new" element={
              <ProtectedRoute>
                <OrderNew />
              </ProtectedRoute>
            } />

            <Route path="/orders/:id" element={
              <ProtectedRoute>
                <OrderDetails />
              </ProtectedRoute>
            } />

            <Route path="/orders/:id/edit" element={
              <ProtectedRoute>
                <OrderEdit />
              </ProtectedRoute>
            } />

            {/* Admin Routes - Only accessible by admins */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            } />

            <Route path="/admin/users" element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <UserManagement />
              </ProtectedRoute>
            } />

            <Route path="/admin/orders" element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <OrderManagement />
              </ProtectedRoute>
            } />

            <Route path="/admin/applications" element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <ApplicationManagement />
              </ProtectedRoute>
            } />

            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
