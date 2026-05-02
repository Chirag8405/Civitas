import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { OfficialCard } from '../OfficialCard';

describe('OfficialCard', () => {
  it('renders header strip with correct title text', () => {
    render(<OfficialCard title="TEST TITLE">Content</OfficialCard>);
    expect(screen.getByText('TEST TITLE')).toBeInTheDocument();
  });

  it('renders children inside content area', () => {
    render(
      <OfficialCard title="Title">
        <div data-testid="child">Test Child</div>
      </OfficialCard>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('applies active red top border when status="active"', () => {
    const { container } = render(
      <OfficialCard title="Title" status="active">Content</OfficialCard>
    );
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('border-t-4', 'border-t-officialRed');
  });

  it('has correct border and background classes', () => {
    const { container } = render(<OfficialCard title="Title">Content</OfficialCard>);
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('border-2', 'border-inkNavy', 'bg-formWhite');
  });
});
