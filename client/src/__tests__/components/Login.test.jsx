import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Login from '../../pages/auth/Login';

// Create mock functions
const mockLogin = vi.fn();
const mockNavigate = vi.fn();

// Mock modules
vi.mock('../../context/AuthContext', () => ({
    useAuth: () => ({
        login: mockLogin,
        user: null,
        loading: false
    })
}));

vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useLocation: () => ({ state: null })
    };
});

vi.mock('react-toastify', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn()
    }
}));

const renderLogin = () => {
    return render(
        <BrowserRouter>
            <Login />
        </BrowserRouter>
    );
};

describe('Login Component', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders login form correctly', () => {
        renderLogin();

        expect(screen.getByText('Welcome Back!')).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/enter your email/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/enter your password/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('shows link to register page', () => {
        renderLogin();

        const signUpLink = screen.getByText(/sign up/i);
        expect(signUpLink).toBeInTheDocument();
    });

    it('shows link to forgot password', () => {
        renderLogin();

        const forgotLink = screen.getByText(/forgot password/i);
        expect(forgotLink).toBeInTheDocument();
    });

    it('allows typing in email and password fields', async () => {
        const user = userEvent.setup();
        renderLogin();

        const emailInput = screen.getByPlaceholderText(/enter your email/i);
        const passwordInput = screen.getByPlaceholderText(/enter your password/i);

        await user.type(emailInput, 'test@example.com');
        await user.type(passwordInput, 'password123');

        expect(emailInput).toHaveValue('test@example.com');
        expect(passwordInput).toHaveValue('password123');
    });

    it('calls login function on form submit', async () => {
        mockLogin.mockResolvedValue({ success: true });
        const user = userEvent.setup();
        renderLogin();

        await user.type(screen.getByPlaceholderText(/enter your email/i), 'test@example.com');
        await user.type(screen.getByPlaceholderText(/enter your password/i), 'password123');
        await user.click(screen.getByRole('button', { name: /sign in/i }));

        await waitFor(() => {
            expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
        });
    });

    it('shows error message on login failure', async () => {
        mockLogin.mockResolvedValue({ success: false, error: 'Invalid credentials' });
        const user = userEvent.setup();
        renderLogin();

        await user.type(screen.getByPlaceholderText(/enter your email/i), 'test@example.com');
        await user.type(screen.getByPlaceholderText(/enter your password/i), 'wrongpassword');
        await user.click(screen.getByRole('button', { name: /sign in/i }));

        await waitFor(() => {
            expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
        });
    });

    it('navigates on successful login', async () => {
        mockLogin.mockResolvedValue({ success: true });
        const user = userEvent.setup();
        renderLogin();

        await user.type(screen.getByPlaceholderText(/enter your email/i), 'test@example.com');
        await user.type(screen.getByPlaceholderText(/enter your password/i), 'password123');
        await user.click(screen.getByRole('button', { name: /sign in/i }));

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/orders', { replace: true });
        });
    });
});
