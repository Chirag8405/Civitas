import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GeminiAdvisor } from '../GeminiAdvisor';

describe('GeminiAdvisor', () => {
  const mockOnSend = jest.fn().mockResolvedValue(undefined);
  const mockMessages = [
    { id: '1', text: 'Advice 1', ref: 'REF-1' },
    { id: '2', text: 'Advice 2' },
  ];

  beforeEach(() => {
    mockOnSend.mockClear();
  });

  it('renders CHIEF ELECTION COMMISSIONER header', () => {
    render(<GeminiAdvisor onSend={mockOnSend} messages={[]} loading={false} />);
    expect(screen.getByText('CHIEF ELECTION COMMISSIONER')).toBeInTheDocument();
  });

  it('renders messages and their references', () => {
    render(<GeminiAdvisor onSend={mockOnSend} messages={mockMessages} loading={false} />);
    expect(screen.getByText('Advice 1')).toBeInTheDocument();
    expect(screen.getByText('REF-1')).toBeInTheDocument();
    expect(screen.getByText('Advice 2')).toBeInTheDocument();
    expect(screen.getByText('ADVISORY REF: CE-0000')).toBeInTheDocument();
  });

  it('shows PROCESSING... when loading is true', () => {
    render(<GeminiAdvisor onSend={mockOnSend} messages={[]} loading={true} />);
    expect(screen.getByText('PROCESSING...')).toBeInTheDocument();
  });

  it('input field and submit button are present', () => {
    render(<GeminiAdvisor onSend={mockOnSend} messages={[]} loading={false} />);
    expect(screen.getByPlaceholderText('Enter advisory query')).toBeInTheDocument();
    expect(screen.getByText('SUBMIT QUERY →')).toBeInTheDocument();
  });

  it('clicking submit calls onSend with input value and clears input', async () => {
    render(<GeminiAdvisor onSend={mockOnSend} messages={[]} loading={false} />);
    const input = screen.getByPlaceholderText('Enter advisory query');
    const button = screen.getByText('SUBMIT QUERY →');

    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.click(button);

    expect(mockOnSend).toHaveBeenCalledWith('Hello');
    await waitFor(() => expect(input).toHaveValue(''));
  });

  it('onSend is not called when input is empty', () => {
    render(<GeminiAdvisor onSend={mockOnSend} messages={[]} loading={false} />);
    const button = screen.getByText('SUBMIT QUERY →');
    fireEvent.click(button);
    expect(mockOnSend).not.toHaveBeenCalled();
  });
});
