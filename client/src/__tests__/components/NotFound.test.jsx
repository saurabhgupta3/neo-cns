import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { NotFound } from '../../pages/common';

const renderNotFound = () => {
    return render(
        <BrowserRouter>
            <NotFound />
        </BrowserRouter>
    );
};

describe('NotFound Component', () => {

    it('renders 404 heading', () => {
        renderNotFound();
        expect(screen.getByText('404')).toBeInTheDocument();
    });

    it('renders page not found message', () => {
        renderNotFound();
        expect(screen.getByText(/page not found/i)).toBeInTheDocument();
    });

    it('shows descriptive message', () => {
        renderNotFound();
        expect(screen.getByText(/does not exist/i)).toBeInTheDocument();
    });

    it('has link to home', () => {
        renderNotFound();
        const homeLink = screen.getByRole('link', { name: /go home/i });
        expect(homeLink).toHaveAttribute('href', '/');
    });
});
