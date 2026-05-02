export const getFirestore = jest.fn(() => ({}));
export const collection = jest.fn();
export const doc = jest.fn();
export const writeBatch = jest.fn(() => ({
  set: jest.fn(),
  commit: jest.fn().mockResolvedValue(undefined),
}));
export const onSnapshot = jest.fn(() => jest.fn());
export const serverTimestamp = jest.fn(() => ({ _seconds: 0 }));
export const query = jest.fn();
export const updateDoc = jest.fn().mockResolvedValue(undefined);
export const getDocs = jest.fn().mockResolvedValue({ size: 0, forEach: jest.fn() });
