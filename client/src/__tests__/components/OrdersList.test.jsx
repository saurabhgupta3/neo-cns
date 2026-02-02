import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import OrdersList from '../../pages/orders/OrdersList';

// Mock state
let mockUser = { _id: '123', name: 'Test User', role: 'user' };
const mockAuthFetch = vi.fn();

vi.mock('../../context/AuthContext', () => ({
    useAuth: () => ({
        user: mockUser,
        authFetch: mockAuthFetch
    })
}));

const renderOrdersList = () => {
    return render(
        <BrowserRouter>
            <OrdersList />
        </BrowserRouter>
    );
};

const mockOrder = {
    _id: 'order123',
    senderName: 'John Sender',
    receiverName: 'Jane Receiver',
    pickupAddress: '123 Pickup St',
    deliveryAddress: '456 Delivery Ave',
    weight: 2.5,
    price: 150,
    status: 'Pending',
    image: 'https://example.com/image.jpg'
};

describe('OrdersList Component', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        mockUser = { _id: '123', name: 'Test User', role: 'user' };
    });

    it('shows loading state initially', () => {
        mockAuthFetch.mockImplementation(() => new Promise(() => { }));
        renderOrdersList();

        expect(screen.getByText(/loading orders/i)).toBeInTheDocument();
    });

    it('shows loading spinner while loading', () => {
        mockAuthFetch.mockImplementation(() => new Promise(() => { }));
        renderOrdersList();

        expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('renders orders list after fetching', async () => {
        mockAuthFetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ orders: [mockOrder] })
        });

        renderOrdersList();

        await waitFor(() => {
            expect(screen.getByText(/john sender/i)).toBeInTheDocument();
        });
    });

    it('shows receiver name in order card', async () => {
        mockAuthFetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ orders: [mockOrder] })
        });

        renderOrdersList();

        await waitFor(() => {
            expect(screen.getByText(/jane receiver/i)).toBeInTheDocument();
        });
    });

    it('shows order status', async () => {
        mockAuthFetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ orders: [mockOrder] })
        });

        renderOrdersList();

        await waitFor(() => {
            expect(screen.getByText('Pending')).toBeInTheDocument();
        });
    });

    it('shows order price', async () => {
        mockAuthFetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ orders: [mockOrder] })
        });

        renderOrdersList();

        await waitFor(() => {
            expect(screen.getByText(/150/)).toBeInTheDocument();
        });
    });

    it('shows New Order button for regular user', async () => {
        mockAuthFetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ orders: [] })
        });

        renderOrdersList();

        await waitFor(() => {
            expect(screen.getByRole('link', { name: /new order/i })).toBeInTheDocument();
        });
    });

    it('shows empty message when no orders', async () => {
        mockAuthFetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ orders: [] })
        });

        renderOrdersList();

        await waitFor(() => {
            expect(screen.getByText(/no orders found/i)).toBeInTheDocument();
        });
    });

    it('shows error message on fetch failure', async () => {
        mockAuthFetch.mockResolvedValue({
            ok: false,
            json: () => Promise.resolve({ message: 'Failed to fetch orders' })
        });

        renderOrdersList();

        await waitFor(() => {
            expect(screen.getByRole('alert')).toBeInTheDocument();
        });
    });

    it('shows "All Orders" heading for regular user', async () => {
        mockAuthFetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ orders: [] })
        });

        renderOrdersList();

        await waitFor(() => {
            expect(screen.getByRole('heading', { name: /all orders/i })).toBeInTheDocument();
        });
    });

    it('shows "My Assigned Orders" heading for courier', async () => {
        mockUser = { _id: '456', name: 'Courier', role: 'courier' };
        mockAuthFetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ orders: [] })
        });

        renderOrdersList();

        await waitFor(() => {
            expect(screen.getByRole('heading', { name: /my assigned orders/i })).toBeInTheDocument();
        });
    });

    it('does NOT show New Order button for courier', async () => {
        mockUser = { _id: '456', name: 'Courier', role: 'courier' };
        mockAuthFetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ orders: [] })
        });

        renderOrdersList();

        await waitFor(() => {
            expect(screen.queryByRole('link', { name: /new order/i })).not.toBeInTheDocument();
        });
    });

    it('links to order details page', async () => {
        mockAuthFetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ orders: [mockOrder] })
        });

        renderOrdersList();

        await waitFor(() => {
            const orderLink = screen.getByRole('link', { name: /john sender/i });
            expect(orderLink).toHaveAttribute('href', `/orders/${mockOrder._id}`);
        });
    });
});
