import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Unauthorized from '../../pages/auth/Unauthorized';

// Mock state
let mockUser = null;

vi.mock('../../context/AuthContext', () => ({
    useAuth: () => ({
        user: mockUser
    })
}));

const renderUnauthorized = () => {
    return render(
        <BrowserRouter>
            <Unauthorized />
        </BrowserRouter>
    );
};

describe('Unauthorized Component', () => {

    beforeEach(() => {
        mockUser = null;
    });

    it('renders 403 error code', () => {
        renderUnauthorized();
        expect(screen.getByText('403')).toBeInTheDocument();
    });

    it('renders access denied heading', () => {
        renderUnauthorized();
        expect(screen.getByRole('heading', { name: /access denied/i })).toBeInTheDocument();
    });

    it('shows permission denied message', () => {
        renderUnauthorized();
        expect(screen.getByText(/don't have permission/i)).toBeInTheDocument();
    });

    it('shows go to orders link', () => {
        renderUnauthorized();
        const link = screen.getByRole('link', { name: /go to orders/i });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href', '/orders');
    });

    it('shows user role when user is logged in', () => {
        mockUser = { _id: '123', name: 'Test User', role: 'user' };
        renderUnauthorized();

        expect(screen.getByText(/user/i)).toBeInTheDocument();
    });

    it('shows courier role when courier is logged in', () => {
        mockUser = { _id: '456', name: 'Courier', role: 'courier' };
        renderUnauthorized();

        expect(screen.getByText(/courier/i)).toBeInTheDocument();
    });
});
