import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { BallotCounter } from '../BallotCounter';

describe('BallotCounter', () => {
  it('renders "0 / 200 VOTES CAST" when current is 0', () => {
    render(<BallotCounter current={0} total={200} />);
    expect(screen.getByText('0 / 200 VOTES CAST')).toBeInTheDocument();
  });

  it('renders "100 / 200 VOTES CAST" when current is 100', () => {
    render(<BallotCounter current={100} total={200} />);
    expect(screen.getByText('100 / 200 VOTES CAST')).toBeInTheDocument();
  });

  it('renders "200 / 200 VOTES CAST" when current equals total', () => {
    render(<BallotCounter current={200} total={200} />);
    expect(screen.getByText('200 / 200 VOTES CAST')).toBeInTheDocument();
  });

  it('aria-live="polite" and aria-atomic="true" are present', () => {
    render(<BallotCounter current={10} total={100} />);
    const counter = screen.getByText('10 / 100 VOTES CAST').parentElement;
    expect(counter).toHaveAttribute('aria-live', 'polite');
    expect(counter).toHaveAttribute('aria-atomic', 'true');
  });

  it('custom label prop replaces "VOTES CAST"', () => {
    render(<BallotCounter current={10} total={100} label="BALLOTS" />);
    expect(screen.getByText('10 / 100 BALLOTS')).toBeInTheDocument();
  });
});
