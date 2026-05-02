export const getFirestore = jest.fn();
export const collection = jest.fn();
export const doc = jest.fn();
export const onSnapshot = jest.fn(() => jest.fn());
export const query = jest.fn();
export const updateDoc = jest.fn();
export const writeBatch = jest.fn(() => ({
  set: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  commit: jest.fn(() => Promise.resolve()),
}));
export const serverTimestamp = jest.fn(() => "mock-timestamp");
export const getDocs = jest.fn(() => Promise.resolve({ forEach: jest.fn() }));
