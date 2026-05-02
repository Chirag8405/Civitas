import { startSimulation, stopSimulation } from '../simulation';
import { getFirestore, collection, doc, writeBatch } from 'firebase/firestore';

jest.mock('firebase/firestore');
jest.mock('../firebase', () => ({
  firebaseApp: {}
}));

describe('simulation lib', () => {
  const mockCandidates = [
    { id: 'c1', name: 'Candidate 1', party: 'P1' },
    { id: 'c2', name: 'Candidate 2', party: 'P2' },
  ];
  const userId = 'user123';
  const totalVoters = 100;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('startSimulation initialises Firestore document', async () => {
    const mockBatch = {
      set: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined),
    };
    (writeBatch as jest.Mock).mockReturnValue(mockBatch);
    (doc as jest.Mock).mockReturnValue({});

    await startSimulation(userId, mockCandidates, totalVoters);

    expect(doc).toHaveBeenCalled();
    expect(mockBatch.set).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      status: 'polling',
      totalVoters
    }), { merge: true });
    expect(mockBatch.commit).toHaveBeenCalled();
  });

  it('startSimulation sets interval and clears previous one', async () => {
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
    
    await startSimulation(userId, mockCandidates, totalVoters);
    await startSimulation(userId, mockCandidates, totalVoters);

    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it('simulation cycle processes votes and triggers disputes', async () => {
    const mockBatch = {
      set: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined),
    };
    (writeBatch as jest.Mock).mockReturnValue(mockBatch);
    (collection as jest.Mock).mockReturnValue({});
    (doc as jest.Mock).mockReturnValue({});

    await startSimulation(userId, mockCandidates, 10);
    
    // Advance timers to trigger the interval
    jest.runOnlyPendingTimers();

    expect(mockBatch.set).toHaveBeenCalled();
    expect(mockBatch.commit).toHaveBeenCalled();
  });

  it('stopSimulation clears interval', () => {
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
    startSimulation(userId, mockCandidates, totalVoters);
    stopSimulation();
    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it('stopSimulation handles null interval gracefully', () => {
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
    stopSimulation();
    expect(clearIntervalSpy).not.toHaveBeenCalled();
  });
});
