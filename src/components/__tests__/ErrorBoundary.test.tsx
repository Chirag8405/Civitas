import React from 'react';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';

describe('ErrorBoundary', () => {
  const ThrowError = () => {
    throw new Error('test error');
  };

  // Silence console.error for expected errors during testing
  let consoleSpy: jest.SpyInstance;
  beforeAll(() => {
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterAll(() => {
    consoleSpy.mockRestore();
  });

  it('renders children when no error thrown', () => {
    render(
      <ErrorBoundary>
        <div>Test Content</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('renders SYSTEM ERROR when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );
    expect(screen.getByText('SYSTEM ERROR')).toBeInTheDocument();
  });

  it('shows error message text', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );
    expect(screen.getByText('test error')).toBeInTheDocument();
  });

  it('renders custom fallback when fallback prop provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom Fallback</div>}>
        <ThrowError />
      </ErrorBoundary>
    );
    expect(screen.getByText('Custom Fallback')).toBeInTheDocument();
  });
});
