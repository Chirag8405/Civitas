import { initializeApp, getApps, getApp } from 'firebase/app';

jest.mock('firebase/app');

describe('firebase lib', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initialises app when no existing apps', () => {
    (getApps as jest.Mock).mockReturnValue([]);
    (initializeApp as jest.Mock).mockReturnValue({ name: 'new-app' });

    // Re-import to trigger initialization
    jest.isolateModules(() => {
      const { firebaseApp } = require('../firebase');
      expect(initializeApp).toHaveBeenCalled();
      expect(firebaseApp.name).toBe('new-app');
    });
  });

  it('returns existing app when already initialised', () => {
    (getApps as jest.Mock).mockReturnValue([{ name: 'existing' }]);
    (getApp as jest.Mock).mockReturnValue({ name: 'existing' });

    jest.isolateModules(() => {
      const { firebaseApp } = require('../firebase');
      expect(initializeApp).not.toHaveBeenCalled();
      expect(getApp).toHaveBeenCalled();
      expect(firebaseApp.name).toBe('existing');
    });
  });
});
