import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Register from '../../pages/auth/Register';

// Create mock functions
const mockRegister = vi.fn();
const mockNavigate = vi.fn();

// Mock modules
vi.mock('../../context/AuthContext', () => ({
    useAuth: () => ({
        register: mockRegister,
        user: null,
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

const renderRegister = () => {
    return render(
        <BrowserRouter>
            <Register />
        </BrowserRouter>
    );
};

describe('Register Component', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders registration form correctly', () => {
        renderRegister();

        expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
        expect(screen.getByText(/join neo-cns and start shipping/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    });

    it('shows link to login page', () => {
        renderRegister();

        expect(screen.getByText(/already have an account/i)).toBeInTheDocument();
        expect(screen.getByText(/sign in/i)).toBeInTheDocument();
    });

    it('allows typing in form fields', async () => {
        const user = userEvent.setup();
        renderRegister();

        await user.type(screen.getByPlaceholderText(/enter your full name/i), 'John Doe');
        await user.type(screen.getByPlaceholderText(/enter your email/i), 'john@example.com');

        expect(screen.getByPlaceholderText(/enter your full name/i)).toHaveValue('John Doe');
        expect(screen.getByPlaceholderText(/enter your email/i)).toHaveValue('john@example.com');
    });

    it('shows error when passwords do not match', async () => {
        const user = userEvent.setup();
        renderRegister();

        await user.type(screen.getByPlaceholderText(/enter your full name/i), 'John Doe');
        await user.type(screen.getByPlaceholderText(/enter your email/i), 'john@example.com');
        await user.type(screen.getByPlaceholderText(/min 6 characters/i), 'password123');
        await user.type(screen.getByPlaceholderText(/re-enter password/i), 'different');
        await user.click(screen.getByRole('button', { name: /create account/i }));

        await waitFor(() => {
            expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
        });

        expect(mockRegister).not.toHaveBeenCalled();
    });

    it('shows error when password is too short', async () => {
        const user = userEvent.setup();
        renderRegister();

        await user.type(screen.getByPlaceholderText(/enter your full name/i), 'John Doe');
        await user.type(screen.getByPlaceholderText(/enter your email/i), 'john@example.com');
        await user.type(screen.getByPlaceholderText(/min 6 characters/i), '123');
        await user.type(screen.getByPlaceholderText(/re-enter password/i), '123');
        await user.click(screen.getByRole('button', { name: /create account/i }));

        await waitFor(() => {
            expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument();
        });

        expect(mockRegister).not.toHaveBeenCalled();
    });

    it('calls register on valid submit', async () => {
        mockRegister.mockResolvedValue({ success: true });
        const user = userEvent.setup();
        renderRegister();

        await user.type(screen.getByPlaceholderText(/enter your full name/i), 'John Doe');
        await user.type(screen.getByPlaceholderText(/enter your email/i), 'john@example.com');
        await user.type(screen.getByPlaceholderText(/min 6 characters/i), 'password123');
        await user.type(screen.getByPlaceholderText(/re-enter password/i), 'password123');
        await user.click(screen.getByRole('button', { name: /create account/i }));

        await waitFor(() => {
            expect(mockRegister).toHaveBeenCalled();
        });
    });

    it('navigates on successful registration', async () => {
        mockRegister.mockResolvedValue({ success: true });
        const user = userEvent.setup();
        renderRegister();

        await user.type(screen.getByPlaceholderText(/enter your full name/i), 'John Doe');
        await user.type(screen.getByPlaceholderText(/enter your email/i), 'john@example.com');
        await user.type(screen.getByPlaceholderText(/min 6 characters/i), 'password123');
        await user.type(screen.getByPlaceholderText(/re-enter password/i), 'password123');
        await user.click(screen.getByRole('button', { name: /create account/i }));

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/orders');
        });
    });

    it('shows error message on registration failure', async () => {
        mockRegister.mockResolvedValue({ success: false, error: 'Email already exists' });
        const user = userEvent.setup();
        renderRegister();

        await user.type(screen.getByPlaceholderText(/enter your full name/i), 'John Doe');
        await user.type(screen.getByPlaceholderText(/enter your email/i), 'existing@example.com');
        await user.type(screen.getByPlaceholderText(/min 6 characters/i), 'password123');
        await user.type(screen.getByPlaceholderText(/re-enter password/i), 'password123');
        await user.click(screen.getByRole('button', { name: /create account/i }));

        await waitFor(() => {
            expect(screen.getByText('Email already exists')).toBeInTheDocument();
        });
    });
});
