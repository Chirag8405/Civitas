import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { StampBadge } from '../StampBadge';

describe('StampBadge', () => {
  it('renders all variants correctly', () => {
    const variants: Array<'CERTIFIED' | 'DISPUTED' | 'PENDING' | 'REJECTED' | 'CLASSIFIED'> = [
      'CERTIFIED', 'DISPUTED', 'PENDING', 'REJECTED', 'CLASSIFIED'
    ];
    variants.forEach(variant => {
      const { unmount } = render(<StampBadge variant={variant} />);
      expect(screen.getByText(variant)).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveAttribute('aria-label', variant);
      unmount();
    });
  });

  it('CERTIFIED has gold color class', () => {
    render(<StampBadge variant="CERTIFIED" />);
    expect(screen.getByText('CERTIFIED')).toHaveClass('text-officialGold');
  });

  it('DISPUTED has red color class', () => {
    render(<StampBadge variant="DISPUTED" />);
    expect(screen.getByText('DISPUTED')).toHaveClass('text-officialRed');
  });

  it('PENDING has navy color class', () => {
    render(<StampBadge variant="PENDING" />);
    expect(screen.getByText('PENDING')).toHaveClass('text-inkNavy');
  });

  it('REJECTED has red color class', () => {
    render(<StampBadge variant="REJECTED" />);
    expect(screen.getByText('REJECTED')).toHaveClass('text-officialRed');
  });

  it('CLASSIFIED has gray color class', () => {
    render(<StampBadge variant="CLASSIFIED" />);
    expect(screen.getByText('CLASSIFIED')).toHaveClass('text-midGray');
  });

  it('rotation style is applied', () => {
    const { container } = render(<StampBadge variant="CERTIFIED" rotate={-5} />);
    const div = container.firstChild as HTMLElement;
    expect(div.style.transform).toContain('rotate(-5deg)');
  });

  it('custom text prop overrides default variant text', () => {
    render(<StampBadge variant="CERTIFIED" text="CUSTOM TEXT" />);
    expect(screen.queryByText('CERTIFIED')).not.toBeInTheDocument();
    expect(screen.getByText('CUSTOM TEXT')).toBeInTheDocument();
  });
});
