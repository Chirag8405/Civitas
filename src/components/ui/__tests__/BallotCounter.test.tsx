import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { BallotCounter } from '../BallotCounter';

describe('BallotCounter', () => {
  it('displays correct fraction text "X / Y VOTES CAST"', () => {
    render(<BallotCounter current={50} total={200} />);
    expect(screen.getByText('50 / 200 VOTES CAST')).toBeInTheDocument();
  });

  it('updates display when current prop changes', () => {
    const { rerender } = render(<BallotCounter current={10} total={100} />);
    expect(screen.getByText('10 / 100 VOTES CAST')).toBeInTheDocument();
    
    rerender(<BallotCounter current={20} total={100} />);
    expect(screen.getByText('20 / 100 VOTES CAST')).toBeInTheDocument();
  });

  it('shows 0 / total when current is 0', () => {
    render(<BallotCounter current={0} total={500} />);
    expect(screen.getByText('0 / 500 VOTES CAST')).toBeInTheDocument();
  });
});
