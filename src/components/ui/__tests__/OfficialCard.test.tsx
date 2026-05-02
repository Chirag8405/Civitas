import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { OfficialCard } from '../OfficialCard';

describe('OfficialCard', () => {
  it('renders with title in header strip', () => {
    render(<OfficialCard title="CARD TITLE">Content</OfficialCard>);
    expect(screen.getByText('CARD TITLE')).toBeInTheDocument();
  });

  it('renders children', () => {
    render(<OfficialCard title="Title">Test Child</OfficialCard>);
    expect(screen.getByText('Test Child')).toBeInTheDocument();
  });

  it('active status applies red top border class', () => {
    const { container } = render(<OfficialCard title="T" status="active">C</OfficialCard>);
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('border-t-4', 'border-t-officialRed');
  });

  it('no status applies no red border', () => {
    const { container } = render(<OfficialCard title="T">C</OfficialCard>);
    const card = container.firstChild as HTMLElement;
    expect(card).not.toHaveClass('border-t-4', 'border-t-officialRed');
  });

  it('className prop is applied to wrapper', () => {
    const { container } = render(<OfficialCard title="T" className="custom-class">C</OfficialCard>);
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('custom-class');
  });

  it('header strip has navy background class', () => {
    render(<OfficialCard title="TITLE">C</OfficialCard>);
    const header = screen.getByText('TITLE');
    expect(header).toHaveClass('bg-inkNavy');
  });

  it('content area parent has white background', () => {
    render(<OfficialCard title="T">CONTENT</OfficialCard>);
    const content = screen.getByText('CONTENT');
    // section -> div(p-6) -> children
    const section = content.parentElement;
    expect(section).toHaveClass('bg-formWhite');
  });
});
