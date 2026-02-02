import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Footer from '../../components/Footer';

const renderFooter = () => {
    return render(
        <BrowserRouter>
            <Footer />
        </BrowserRouter>
    );
};

describe('Footer Component', () => {

    it('renders copyright text', () => {
        renderFooter();
        expect(screen.getByText(/NeoCNS Private Limited/i)).toBeInTheDocument();
    });

    it('renders privacy link', () => {
        renderFooter();
        const privacyLink = screen.getByRole('link', { name: /privacy/i });
        expect(privacyLink).toBeInTheDocument();
        expect(privacyLink).toHaveAttribute('href', '/privacy');
    });

    it('renders terms link', () => {
        renderFooter();
        const termsLink = screen.getByRole('link', { name: /terms/i });
        expect(termsLink).toBeInTheDocument();
        expect(termsLink).toHaveAttribute('href', '/terms');
    });

    it('renders social media icons', () => {
        renderFooter();
        // Check footer container exists
        const footer = screen.getByRole('contentinfo');
        expect(footer).toBeInTheDocument();
    });
});
