import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DisputeModal } from '../DisputeModal';

describe('DisputeModal', () => {
  const pendingDispute = {
    id: 'd1',
    zone: 'Zone 1',
    reason: 'Irregularity in ballot count',
    votesAffected: 42
  };

  const mockOnRuling = jest.fn();

  beforeEach(() => {
    mockOnRuling.mockClear();
  });

  it('returns null when pendingDispute is null', () => {
    const { container } = render(
      <DisputeModal
        pendingDispute={null}
        disputeAdvisory=""
        advisoryLoading={false}
        onRuling={mockOnRuling}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal when pendingDispute provided', () => {
    render(
      <DisputeModal
        pendingDispute={pendingDispute}
        disputeAdvisory="Legal advisory text"
        advisoryLoading={false}
        onRuling={mockOnRuling}
      />
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows zone name in title', () => {
    render(
      <DisputeModal
        pendingDispute={pendingDispute}
        disputeAdvisory=""
        advisoryLoading={false}
        onRuling={mockOnRuling}
      />
    );
    expect(screen.getByText(/Zone 1/)).toBeInTheDocument();
  });

  it('shows DISPUTED stamp badge', () => {
    render(
      <DisputeModal
        pendingDispute={pendingDispute}
        disputeAdvisory=""
        advisoryLoading={false}
        onRuling={mockOnRuling}
      />
    );
    expect(screen.getByText('DISPUTED')).toBeInTheDocument();
  });

  it('shows loading message when advisoryLoading true', () => {
    render(
      <DisputeModal
        pendingDispute={pendingDispute}
        disputeAdvisory="Should not show"
        advisoryLoading={true}
        onRuling={mockOnRuling}
      />
    );
    expect(screen.getByText(/Consulting legal precedence/)).toBeInTheDocument();
  });

  it('shows advisory text when advisoryLoading false', () => {
    render(
      <DisputeModal
        pendingDispute={pendingDispute}
        disputeAdvisory="Legal advisory text"
        advisoryLoading={false}
        onRuling={mockOnRuling}
      />
    );
    expect(screen.getByText('Legal advisory text')).toBeInTheDocument();
  });

  it('ACCEPT button calls onRuling with "ACCEPT"', () => {
    render(
      <DisputeModal
        pendingDispute={pendingDispute}
        disputeAdvisory=""
        advisoryLoading={false}
        onRuling={mockOnRuling}
      />
    );
    fireEvent.click(screen.getByText(/ACCEPT VOTES/));
    expect(mockOnRuling).toHaveBeenCalledWith('ACCEPT');
  });

  it('REJECT button calls onRuling with "REJECT"', () => {
    render(
      <DisputeModal
        pendingDispute={pendingDispute}
        disputeAdvisory=""
        advisoryLoading={false}
        onRuling={mockOnRuling}
      />
    );
    fireEvent.click(screen.getByText(/REJECT VOTES/));
    expect(mockOnRuling).toHaveBeenCalledWith('REJECT');
  });

  it('has role="dialog"', () => {
    render(
      <DisputeModal
        pendingDispute={pendingDispute}
        disputeAdvisory=""
        advisoryLoading={false}
        onRuling={mockOnRuling}
      />
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('has aria-modal="true"', () => {
    render(
      <DisputeModal
        pendingDispute={pendingDispute}
        disputeAdvisory=""
        advisoryLoading={false}
        onRuling={mockOnRuling}
      />
    );
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  });
});
