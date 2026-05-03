import { startSimulation, stopSimulation } from '../simulation';
import { collection, doc, writeBatch } from 'firebase/firestore';

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  collection: jest.fn(),
  doc: jest.fn(),
  writeBatch: jest.fn(() => ({
    set: jest.fn(),
    commit: jest.fn().mockResolvedValue(undefined),
  })),
  serverTimestamp: jest.fn(() => ({ _seconds: 0 })),
  getDocs: jest.fn().mockResolvedValue({ size: 0 }),
}));

jest.mock('../firebase', () => ({
  firebaseApp: {}
}));

describe('simulation lib', () => {
  const mockCandidates = [
    { id: 'c1', name: 'Candidate 1', party: 'P1', votes: 0 },
    { id: 'c2', name: 'Candidate 2', party: 'P2', votes: 0 },
  ];
  const userId = 'user123';
  const totalVoters = 100;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    stopSimulation(); // Reset isRunning guard
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
    stopSimulation(); // Reset guard manually to allow second start
    await startSimulation(userId, mockCandidates, totalVoters);

    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it('simulation cycle processes votes and triggers disputes at 60%', async () => {
    const mockBatch = {
      set: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined),
    };
    (writeBatch as jest.Mock).mockReturnValue(mockBatch);
    (collection as jest.Mock).mockReturnValue({});
    (doc as jest.Mock).mockReturnValue({});

    // Small number to reach 60% quickly
    const smallTotal = 10;
    await startSimulation(userId, mockCandidates, smallTotal);

    // First tick
    jest.runOnlyPendingTimers();
    // Second tick - should reach 6 votes (60%)
    jest.runOnlyPendingTimers();

    // Check if dispute was set
    const allCalls = mockBatch.set.mock.calls;
    const disputeCall = allCalls.find((call: any[]) =>
      call[1] && call[1].status === 'PENDING'
    );
    expect(disputeCall).toBeDefined();
    expect(disputeCall[1].zone).toBe('Zone 3');
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

  it('handles write errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    const mockBatch = {
      set: jest.fn(),
      commit: jest.fn().mockRejectedValue(new Error('Firestore Error')),
    };
    (writeBatch as jest.Mock).mockReturnValue(mockBatch);

    await startSimulation(userId, mockCandidates, 10);
    jest.runOnlyPendingTimers();

    // Wait for promise resolution
    await Promise.resolve();
    await Promise.resolve();

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('FAILED'), expect.any(String));
    consoleSpy.mockRestore();
  });

  it('logic test: getZone and pickCandidate coverage', async () => {
    // This is hard to test directly because they are private to startSimulation
    // but we can infer them from the data passed to batch.set
    const mockBatch = {
      set: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined),
    };
    (writeBatch as jest.Mock).mockReturnValue(mockBatch);

    await startSimulation(userId, mockCandidates, 100);

    // Run multiple ticks to get different zones
    for (let i = 0; i < 10; i++) {
      jest.runOnlyPendingTimers();
    }

    const setCalls = mockBatch.set.mock.calls;
    const zones = setCalls.map(c => c[1]?.zoneId).filter(Boolean);
    const candidateIds = setCalls.map(c => c[1]?.candidateId).filter(Boolean);

    expect(zones).toContain('Zone 1');
    // Depending on random batches, we might see Zone 2/3
    expect(candidateIds.every(id => ['c1', 'c2'].includes(id))).toBe(true);
  });
});
