import { useSimulationStore } from '../simulation.store';

describe('simulation store', () => {
  beforeEach(() => {
    useSimulationStore.getState().resetSimulation();
  });

  it('initial state matches expected shape', () => {
    const state = useSimulationStore.getState();
    expect(state.phase).toBe('setup');
    expect(state.constituency.name).toBe('');
    expect(state.election.candidates).toEqual([]);
    expect(state.results.votes).toEqual([]);
  });

  it('setPhase transitions correctly', () => {
    const { setPhase } = useSimulationStore.getState();
    setPhase('polling');
    expect(useSimulationStore.getState().phase).toBe('polling');
    setPhase('results');
    expect(useSimulationStore.getState().phase).toBe('results');
  });

  it('updateConstituency merges partial updates', () => {
    const { updateConstituency } = useSimulationStore.getState();
    updateConstituency({ name: 'New City' });
    expect(useSimulationStore.getState().constituency.name).toBe('New City');
    expect(useSimulationStore.getState().constituency.country).toBe('');
    
    updateConstituency({ country: 'Testland' });
    expect(useSimulationStore.getState().constituency.name).toBe('New City');
    expect(useSimulationStore.getState().constituency.country).toBe('Testland');
  });

  it('updateElection merges partial updates', () => {
    const { updateElection } = useSimulationStore.getState();
    updateElection({ calendarId: 'cal123' });
    expect(useSimulationStore.getState().election.calendarId).toBe('cal123');
    expect(useSimulationStore.getState().election.languages).toEqual([]);
  });

  it('updateResults merges partial updates', () => {
    const { updateResults } = useSimulationStore.getState();
    updateResults({ certified: true });
    expect(useSimulationStore.getState().results.certified).toBe(true);
    expect(useSimulationStore.getState().results.slidesUrl).toBe('');
  });

  it('resetSimulation returns to initial state', () => {
    const { setPhase, updateConstituency, resetSimulation } = useSimulationStore.getState();
    setPhase('polling');
    updateConstituency({ name: 'Dirty' });
    resetSimulation();
    expect(useSimulationStore.getState().phase).toBe('setup');
    expect(useSimulationStore.getState().constituency.name).toBe('');
  });
});
