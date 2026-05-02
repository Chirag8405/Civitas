import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { StampBadge } from '../StampBadge';

describe('StampBadge', () => {
  it('renders CERTIFIED variant with gold text class', () => {
    render(<StampBadge variant="CERTIFIED" />);
    const badge = screen.getByText('CERTIFIED');
    expect(badge).toHaveClass('text-govGold');
  });

  it('renders DISPUTED variant with red text class', () => {
    render(<StampBadge variant="DISPUTED" />);
    const badge = screen.getByText('DISPUTED');
    expect(badge).toHaveClass('text-officialRed');
  });

  it('renders PENDING variant with navy text class', () => {
    render(<StampBadge variant="PENDING" />);
    const badge = screen.getByText('PENDING');
    expect(badge).toHaveClass('text-inkNavy');
  });

  it('applies rotation transform class', () => {
    render(<StampBadge variant="DISPUTED" />);
    const badge = screen.getByText('DISPUTED');
    expect(badge).toHaveClass('-rotate-2');
  });

  it('renders custom text prop when provided', () => {
    render(<StampBadge variant="CERTIFIED" text="CUSTOM TEXT" />);
    expect(screen.getByText('CUSTOM TEXT')).toBeInTheDocument();
  });
});
