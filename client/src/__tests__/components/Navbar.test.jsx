import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Navbar from '../../components/Navbar';

// Mock state
let mockUser = null;
let mockIsAuthenticated = false;
const mockLogout = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../../context/AuthContext', () => ({
    useAuth: () => ({
        user: mockUser,
        isAuthenticated: mockIsAuthenticated,
        logout: mockLogout,
        loading: false
    })
}));

vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        useNavigate: () => mockNavigate
    };
});

vi.mock('react-toastify', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn()
    }
}));

const renderNavbar = () => {
    return render(
        <BrowserRouter>
            <Navbar />
        </BrowserRouter>
    );
};

describe('Navbar Component', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        mockUser = null;
        mockIsAuthenticated = false;
    });

    describe('When user is NOT logged in', () => {

        it('renders brand logo', () => {
            renderNavbar();
            expect(screen.getByText('Neo-CNS')).toBeInTheDocument();
        });

        it('shows login link', () => {
            renderNavbar();
            expect(screen.getByRole('link', { name: /login/i })).toBeInTheDocument();
        });

        it('shows register link', () => {
            renderNavbar();
            expect(screen.getByRole('link', { name: /register/i })).toBeInTheDocument();
        });

        it('does not show logout button', () => {
            renderNavbar();
            expect(screen.queryByRole('button', { name: /logout/i })).not.toBeInTheDocument();
        });

        it('does not show orders link', () => {
            renderNavbar();
            expect(screen.queryByRole('link', { name: /all orders/i })).not.toBeInTheDocument();
        });
    });

    describe('When regular user IS logged in', () => {

        beforeEach(() => {
            mockUser = { _id: '123', name: 'Test User', role: 'user' };
            mockIsAuthenticated = true;
        });

        it('shows user name', () => {
            renderNavbar();
            expect(screen.getByText('Test User')).toBeInTheDocument();
        });

        it('shows user role badge', () => {
            renderNavbar();
            expect(screen.getByText('user')).toBeInTheDocument();
        });

        it('shows orders link', () => {
            renderNavbar();
            expect(screen.getByRole('link', { name: /all orders/i })).toBeInTheDocument();
        });

        it('shows add new order link', () => {
            renderNavbar();
            expect(screen.getByRole('link', { name: /add new order/i })).toBeInTheDocument();
        });

        it('shows logout button', () => {
            renderNavbar();
            expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
        });

        it('does not show admin dropdown', () => {
            renderNavbar();
            expect(screen.queryByText('Admin')).not.toBeInTheDocument();
        });

        it('hides login/register links', () => {
            renderNavbar();
            expect(screen.queryByRole('link', { name: /^login$/i })).not.toBeInTheDocument();
            expect(screen.queryByRole('link', { name: /^register$/i })).not.toBeInTheDocument();
        });

        it('calls logout on button click', async () => {
            const user = userEvent.setup();
            renderNavbar();

            await user.click(screen.getByRole('button', { name: /logout/i }));
            expect(mockLogout).toHaveBeenCalled();
        });

        it('navigates to login after logout', async () => {
            const user = userEvent.setup();
            renderNavbar();

            await user.click(screen.getByRole('button', { name: /logout/i }));
            expect(mockNavigate).toHaveBeenCalledWith('/login');
        });
    });

    describe('When admin IS logged in', () => {

        beforeEach(() => {
            mockUser = { _id: '456', name: 'Admin User', role: 'admin' };
            mockIsAuthenticated = true;
        });

        it('shows admin dropdown', () => {
            renderNavbar();
            expect(screen.getByText('Admin')).toBeInTheDocument();
        });

        it('shows admin role badge', () => {
            renderNavbar();
            expect(screen.getByText('admin')).toBeInTheDocument();
        });

        it('shows add new order link for admin', () => {
            renderNavbar();
            expect(screen.getByRole('link', { name: /add new order/i })).toBeInTheDocument();
        });
    });

    describe('When courier IS logged in', () => {

        beforeEach(() => {
            mockUser = { _id: '789', name: 'Courier User', role: 'courier' };
            mockIsAuthenticated = true;
        });

        it('shows courier role badge', () => {
            renderNavbar();
            expect(screen.getByText('courier')).toBeInTheDocument();
        });

        it('shows orders link', () => {
            renderNavbar();
            expect(screen.getByRole('link', { name: /all orders/i })).toBeInTheDocument();
        });

        it('does NOT show add new order for courier', () => {
            renderNavbar();
            expect(screen.queryByRole('link', { name: /add new order/i })).not.toBeInTheDocument();
        });

        it('does NOT show admin dropdown for courier', () => {
            renderNavbar();
            expect(screen.queryByText('Admin')).not.toBeInTheDocument();
        });
    });
});
