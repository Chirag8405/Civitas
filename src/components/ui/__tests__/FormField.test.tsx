import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { FormField, OfficialInput } from '../FormField';

describe('FormField', () => {
  it('renders label and children', () => {
    render(
      <FormField label="FULL NAME" id="name">
        <OfficialInput id="name" data-testid="input" />
      </FormField>
    );
    expect(screen.getByText('FULL NAME')).toBeInTheDocument();
    expect(screen.getByTestId('input')).toBeInTheDocument();
  });

  it('error message appears when error prop provided', () => {
    render(
      <FormField label="L" id="i" error="ERROR MESSAGE">
        <OfficialInput id="i" />
      </FormField>
    );
    expect(screen.getByText('ERROR MESSAGE')).toBeInTheDocument();
  });

  it('no error message when error prop absent', () => {
    render(
      <FormField label="L" id="i">
        <OfficialInput id="i" />
      </FormField>
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('error applies red border class to input', () => {
    render(
      <FormField label="L" id="i" error="E">
        <OfficialInput id="i" />
      </FormField>
    );
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('border-officialRed', 'bg-stampRedBg');
  });

  it('label has uppercase tracking class', () => {
    render(<FormField label="LABEL TEXT" id="i"><OfficialInput id="i" /></FormField>);
    const label = screen.getByText('LABEL TEXT');
    expect(label).toHaveClass('uppercase', 'tracking-[0.12em]');
  });

  it('label htmlFor matches input id', () => {
    render(<FormField label="L" id="test-id"><OfficialInput id="test-id" /></FormField>);
    const label = screen.getByText('L').parentElement;
    expect(label).toHaveAttribute('for', 'test-id');
  });
});
