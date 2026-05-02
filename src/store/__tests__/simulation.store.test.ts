import { useSimulationStore } from '../../store/simulation.store';

describe('simulationStore', () => {
  beforeEach(() => {
    useSimulationStore.getState().resetSimulation();
  });

  it('initial phase is "setup"', () => {
    expect(useSimulationStore.getState().phase).toBe('setup');
  });

  it('updateConstituency merges correctly', () => {
    useSimulationStore.getState().updateConstituency({ name: 'Test City' });
    expect(useSimulationStore.getState().constituency.name).toBe('Test City');
    
    useSimulationStore.getState().updateConstituency({ country: 'Testland' });
    expect(useSimulationStore.getState().constituency.name).toBe('Test City');
    expect(useSimulationStore.getState().constituency.country).toBe('Testland');
  });

  it('phase advances when setPhase called', () => {
    useSimulationStore.getState().setPhase('polling');
    expect(useSimulationStore.getState().phase).toBe('polling');
  });

  it('updateElection stores candidates correctly', () => {
    const candidates = [{ id: 'c1', name: 'Alice', party: 'A' }];
    useSimulationStore.getState().updateElection({ candidates });
    expect(useSimulationStore.getState().election.candidates).toEqual(candidates);
  });

  it('updateConstituency with pollingBooths stores correctly', () => {
    const booths = [{ id: 'b1', name: 'Booth 1', location: { lat: 0, lng: 0 } }];
    useSimulationStore.getState().updateConstituency({ pollingBooths: booths });
    expect(useSimulationStore.getState().constituency.pollingBooths).toEqual(booths);
  });

  it('updateResults with votes stores correctly', () => {
    const votes = [{ id: 'v1', candidateId: 'c1', zoneId: 'z1', timestamp: 'now' }];
    useSimulationStore.getState().updateResults({ votes } as any);
    expect(useSimulationStore.getState().results.votes).toEqual(votes);
  });

  it('reset clears all state back to initial', () => {
    useSimulationStore.getState().updateConstituency({ name: 'Changed' });
    useSimulationStore.getState().resetSimulation();
    expect(useSimulationStore.getState().constituency.name).toBe('');
  });
});
