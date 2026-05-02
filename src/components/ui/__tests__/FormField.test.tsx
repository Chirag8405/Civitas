import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { FormField, OfficialInput } from '../FormField';

describe('FormField', () => {
  it('renders label text correctly', () => {
    render(
      <FormField label="Full Name" id="name">
        <OfficialInput id="name" />
      </FormField>
    );
    expect(screen.getByText('Full Name')).toBeInTheDocument();
  });

  it('renders error message when error prop passed', () => {
    render(
      <FormField label="Label" id="id" error="This field is required">
        <OfficialInput id="id" />
      </FormField>
    );
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('applies error styles to input when error present', () => {
    render(
      <FormField label="Label" id="id" error="Error">
        <OfficialInput id="id" />
      </FormField>
    );
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('border-officialRed', 'bg-stampRedBg');
  });

  it('label has correct font mono and tracking classes', () => {
    render(
      <FormField label="Label" id="id">
        <OfficialInput id="id" />
      </FormField>
    );
    const label = screen.getByText('Label');
    expect(label).toHaveClass('font-mono', 'uppercase', 'tracking-[0.12em]');
  });
});
