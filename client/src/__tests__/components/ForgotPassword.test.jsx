import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import ForgotPassword from '../../pages/auth/ForgotPassword';

// Mock fetch
global.fetch = vi.fn();

vi.mock('react-toastify', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn()
    }
}));

const renderForgotPassword = () => {
    return render(
        <BrowserRouter>
            <ForgotPassword />
        </BrowserRouter>
    );
};

describe('ForgotPassword Component', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders forgot password form', () => {
        renderForgotPassword();

        expect(screen.getByRole('heading', { name: /forgot password/i })).toBeInTheDocument();
        expect(screen.getByText(/enter your email to receive a reset link/i)).toBeInTheDocument();
    });

    it('renders email input', () => {
        renderForgotPassword();

        expect(screen.getByPlaceholderText(/enter your email/i)).toBeInTheDocument();
    });

    it('renders send reset link button', () => {
        renderForgotPassword();

        expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
    });

    it('renders back to login link', () => {
        renderForgotPassword();

        expect(screen.getByRole('link', { name: /back to login/i })).toBeInTheDocument();
    });

    it('allows typing in email field', async () => {
        const user = userEvent.setup();
        renderForgotPassword();

        const emailInput = screen.getByPlaceholderText(/enter your email/i);
        await user.type(emailInput, 'test@example.com');

        expect(emailInput).toHaveValue('test@example.com');
    });

    it('shows success message after sending email', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ success: true })
        });

        const user = userEvent.setup();
        renderForgotPassword();

        await user.type(screen.getByPlaceholderText(/enter your email/i), 'test@example.com');
        await user.click(screen.getByRole('button', { name: /send reset link/i }));

        await waitFor(() => {
            expect(screen.getByText(/check your email/i)).toBeInTheDocument();
        });
    });

    it('displays the email address in success message', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ success: true })
        });

        const user = userEvent.setup();
        renderForgotPassword();

        await user.type(screen.getByPlaceholderText(/enter your email/i), 'myemail@test.com');
        await user.click(screen.getByRole('button', { name: /send reset link/i }));

        await waitFor(() => {
            expect(screen.getByText(/myemail@test.com/i)).toBeInTheDocument();
        });
    });

    it('shows loading state when submitting', async () => {
        global.fetch.mockImplementation(() => new Promise(() => { })); // Never resolves

        const user = userEvent.setup();
        renderForgotPassword();

        await user.type(screen.getByPlaceholderText(/enter your email/i), 'test@example.com');
        await user.click(screen.getByRole('button', { name: /send reset link/i }));

        expect(screen.getByText(/sending/i)).toBeInTheDocument();
    });
});
