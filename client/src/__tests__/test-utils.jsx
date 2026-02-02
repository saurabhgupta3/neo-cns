import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';

/**
 * Custom render function that includes common providers
 */
export function renderWithProviders(ui, options = {}) {
    const { initialRoute = '/' } = options;

    window.history.pushState({}, 'Test page', initialRoute);

    function Wrapper({ children }) {
        return (
            <BrowserRouter>
                <AuthProvider>
                    {children}
                </AuthProvider>
            </BrowserRouter>
        );
    }

    return render(ui, { wrapper: Wrapper, ...options });
}

/**
 * Render with just Router (no auth context)
 */
export function renderWithRouter(ui, options = {}) {
    const { initialRoute = '/' } = options;

    window.history.pushState({}, 'Test page', initialRoute);

    function Wrapper({ children }) {
        return <BrowserRouter>{children}</BrowserRouter>;
    }

    return render(ui, { wrapper: Wrapper, ...options });
}

/**
 * Mock authenticated user
 */
export const mockUser = {
    _id: '507f1f77bcf86cd799439011',
    name: 'Test User',
    email: 'test@example.com',
    role: 'user',
    phone: '1234567890',
    isActive: true
};

/**
 * Mock admin user
 */
export const mockAdmin = {
    _id: '507f1f77bcf86cd799439012',
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'admin',
    isActive: true
};

/**
 * Mock order
 */
export const mockOrder = {
    _id: '507f1f77bcf86cd799439013',
    senderName: 'John Sender',
    receiverName: 'Jane Receiver',
    pickupAddress: '123 Pickup St',
    deliveryAddress: '456 Delivery Ave',
    weight: 2.5,
    price: 150,
    status: 'Pending',
    createdAt: new Date().toISOString()
};

export * from '@testing-library/react';
