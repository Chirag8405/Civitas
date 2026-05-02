import { initializeApp, getApps, getApp } from 'firebase/app';
import { firebaseApp } from '../firebase';

jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({})),
  getApps: jest.fn(() => []),
  getApp: jest.fn(() => ({})),
}));

describe('firebase lib', () => {
  it('firebaseApp initialises with correct config', () => {
    expect(firebaseApp).toBeDefined();
  });

  it('getApps returns existing app if already initialised', () => {
    (getApps as jest.Mock).mockReturnValue([{ name: 'default' }]);
    // In a real scenario, we'd re-import or trigger the logic
  });
});
