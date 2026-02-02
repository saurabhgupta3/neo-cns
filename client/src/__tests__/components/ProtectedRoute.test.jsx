import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute, PublicRoute } from '../../components/ProtectedRoute';

// Mock state
let mockIsAuthenticated = false;
let mockUser = null;
let mockLoading = false;

vi.mock('../../context/AuthContext', () => ({
    useAuth: () => ({
        isAuthenticated: mockIsAuthenticated,
        user: mockUser,
        loading: mockLoading
    })
}));

describe('ProtectedRoute Component', () => {

    beforeEach(() => {
        mockIsAuthenticated = false;
        mockUser = null;
        mockLoading = false;
    });

    it('shows loading spinner when loading', () => {
        mockLoading = true;

        render(
            <MemoryRouter>
                <ProtectedRoute>
                    <div>Protected Content</div>
                </ProtectedRoute>
            </MemoryRouter>
        );

        expect(screen.getByRole('status')).toBeInTheDocument();
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('redirects to login when not authenticated', () => {
        mockIsAuthenticated = false;

        render(
            <MemoryRouter initialEntries={['/protected']}>
                <Routes>
                    <Route path="/protected" element={
                        <ProtectedRoute>
                            <div>Protected Content</div>
                        </ProtectedRoute>
                    } />
                    <Route path="/login" element={<div>Login Page</div>} />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByText('Login Page')).toBeInTheDocument();
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('renders children when authenticated', () => {
        mockIsAuthenticated = true;
        mockUser = { _id: '123', name: 'Test', role: 'user' };

        render(
            <MemoryRouter>
                <ProtectedRoute>
                    <div>Protected Content</div>
                </ProtectedRoute>
            </MemoryRouter>
        );

        expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('allows access for allowed role', () => {
        mockIsAuthenticated = true;
        mockUser = { _id: '123', name: 'Admin', role: 'admin' };

        render(
            <MemoryRouter>
                <ProtectedRoute allowedRoles={['admin']}>
                    <div>Admin Content</div>
                </ProtectedRoute>
            </MemoryRouter>
        );

        expect(screen.getByText('Admin Content')).toBeInTheDocument();
    });

    it('redirects to unauthorized for wrong role', () => {
        mockIsAuthenticated = true;
        mockUser = { _id: '123', name: 'User', role: 'user' };

        render(
            <MemoryRouter initialEntries={['/admin']}>
                <Routes>
                    <Route path="/admin" element={
                        <ProtectedRoute allowedRoles={['admin']}>
                            <div>Admin Content</div>
                        </ProtectedRoute>
                    } />
                    <Route path="/unauthorized" element={<div>Unauthorized Page</div>} />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByText('Unauthorized Page')).toBeInTheDocument();
        expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
    });

    it('allows multiple roles', () => {
        mockIsAuthenticated = true;
        mockUser = { _id: '123', name: 'Courier', role: 'courier' };

        render(
            <MemoryRouter>
                <ProtectedRoute allowedRoles={['admin', 'courier']}>
                    <div>Staff Content</div>
                </ProtectedRoute>
            </MemoryRouter>
        );

        expect(screen.getByText('Staff Content')).toBeInTheDocument();
    });
});

describe('PublicRoute Component', () => {

    beforeEach(() => {
        mockIsAuthenticated = false;
        mockUser = null;
        mockLoading = false;
    });

    it('shows loading spinner when loading', () => {
        mockLoading = true;

        render(
            <MemoryRouter>
                <PublicRoute>
                    <div>Login Form</div>
                </PublicRoute>
            </MemoryRouter>
        );

        expect(screen.getByRole('status')).toBeInTheDocument();
        expect(screen.queryByText('Login Form')).not.toBeInTheDocument();
    });

    it('renders children when not authenticated', () => {
        mockIsAuthenticated = false;

        render(
            <MemoryRouter>
                <PublicRoute>
                    <div>Login Form</div>
                </PublicRoute>
            </MemoryRouter>
        );

        expect(screen.getByText('Login Form')).toBeInTheDocument();
    });

    it('redirects to orders when authenticated', () => {
        mockIsAuthenticated = true;

        render(
            <MemoryRouter initialEntries={['/login']}>
                <Routes>
                    <Route path="/login" element={
                        <PublicRoute>
                            <div>Login Form</div>
                        </PublicRoute>
                    } />
                    <Route path="/orders" element={<div>Orders Page</div>} />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByText('Orders Page')).toBeInTheDocument();
        expect(screen.queryByText('Login Form')).not.toBeInTheDocument();
    });
});
