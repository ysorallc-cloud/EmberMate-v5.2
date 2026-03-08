import * as eventEmitter from '../utils/eventEmitter';
import * as eventRepo from '../storage/eventRepo';

jest.mock('../storage/eventRepo', () => ({
  saveEvent: jest.fn().mockResolvedValue({
    id: 'evt_test',
    createdAt: new Date().toISOString(),
  }),
}));

jest.mock('../utils/devLog', () => ({
  logError: jest.fn(),
}));

describe('Event Emitter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('emitMedicationEvent saves medication_taken event', async () => {
    await eventEmitter.emitMedicationEvent('med1', 'Metformin', 'taken');

    expect(eventRepo.saveEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'medication_taken',
        status: 'completed',
        metadata: expect.objectContaining({
          medicationId: 'med1',
          medicationName: 'Metformin',
        }),
      })
    );
  });

  test('emitMedicationEvent saves medication_skipped for skipped', async () => {
    await eventEmitter.emitMedicationEvent('med1', 'Aspirin', 'skipped');

    expect(eventRepo.saveEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'medication_skipped',
        status: 'skipped',
      })
    );
  });

  test('emitHydrationEvent saves with glass count', async () => {
    await eventEmitter.emitHydrationEvent(5);

    expect(eventRepo.saveEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'hydration_logged',
        value: 5,
      })
    );
  });

  test('emitMealEvent saves with meal type', async () => {
    await eventEmitter.emitMealEvent('breakfast', { quality: 'good' });

    expect(eventRepo.saveEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'meal_logged',
        metadata: expect.objectContaining({ mealType: 'breakfast' }),
      })
    );
  });

  test('emitter does not throw on saveEvent failure', async () => {
    (eventRepo.saveEvent as jest.Mock).mockRejectedValueOnce(new Error('Storage full'));

    // Should not throw
    await expect(
      eventEmitter.emitMedicationEvent('med1', 'Test', 'taken')
    ).resolves.toBeUndefined();
  });

  test('source defaults to dedicated_screen', async () => {
    await eventEmitter.emitVitalsEvent({ systolic: 120 });

    expect(eventRepo.saveEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'dedicated_screen',
      })
    );
  });

  test('source can be overridden to quick_log', async () => {
    await eventEmitter.emitVitalsEvent({ systolic: 120 }, { source: 'quick_log' });

    expect(eventRepo.saveEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'quick_log',
      })
    );
  });
});
