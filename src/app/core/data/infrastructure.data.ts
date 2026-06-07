import type {
  ColonySupportEmergencyActionDefinition,
  ColonySupportUpgradeDefinition,
  StorageUpgradeDefinition,
} from '../models';

export const COLONY_SUPPORT_UPGRADES: readonly ColonySupportUpgradeDefinition[] = [
  {
    id: 'solar_array_i',
    name: 'Solar Array I',
    description: 'Increase the colony energy buffer and begin a passive solar trickle.',
    cost: [{ resourceId: 'credits', quantity: 45 }],
    boosts: [{ resourceId: 'energy', quantity: 20 }],
    passiveGeneration: {
      resourceId: 'energy',
      quantity: 3,
      intervalSeconds: 20,
      energyCost: 1,
    },
  },
  {
    id: 'solar_array_ii',
    name: 'Solar Array II',
    description: 'Increase solar throughput and widen the energy buffer again.',
    cost: [{ resourceId: 'credits', quantity: 70 }],
    boosts: [{ resourceId: 'energy', quantity: 20 }],
    passiveGeneration: {
      resourceId: 'energy',
      quantity: 5,
      intervalSeconds: 20,
      energyCost: 1,
    },
    requiresUpgradeIds: ['solar_array_i'],
  },
  {
    id: 'water_recycler_i',
    name: 'Water Recycler I',
    description: 'Expand stored water reserves and begin passive recycling.',
    cost: [{ resourceId: 'credits', quantity: 55 }],
    boosts: [{ resourceId: 'water', quantity: 24 }],
    passiveGeneration: {
      resourceId: 'water',
      quantity: 3,
      intervalSeconds: 20,
      energyCost: 1,
    },
  },
  {
    id: 'water_recycler_ii',
    name: 'Water Recycler II',
    description: 'Increase recycler throughput for longer self-sustained runs.',
    cost: [{ resourceId: 'credits', quantity: 75 }],
    boosts: [{ resourceId: 'water', quantity: 24 }],
    passiveGeneration: {
      resourceId: 'water',
      quantity: 5,
      intervalSeconds: 20,
      energyCost: 2,
    },
    requiresUpgradeIds: ['water_recycler_i'],
  },
  {
    id: 'oxygen_recycler_i',
    name: 'Oxygen Recycler I',
    description: 'Stabilize oxygen supply with passive habitat recycling.',
    cost: [{ resourceId: 'credits', quantity: 40 }],
    boosts: [{ resourceId: 'oxygen', quantity: 16 }],
    passiveGeneration: {
      resourceId: 'oxygen',
      quantity: 2,
      intervalSeconds: 20,
      energyCost: 1,
    },
  },
  {
    id: 'oxygen_recycler_ii',
    name: 'Oxygen Recycler II',
    description: 'Push the recycler harder for stronger passive oxygen recovery.',
    cost: [{ resourceId: 'credits', quantity: 60 }],
    boosts: [{ resourceId: 'oxygen', quantity: 16 }],
    passiveGeneration: {
      resourceId: 'oxygen',
      quantity: 4,
      intervalSeconds: 20,
      energyCost: 2,
    },
    requiresUpgradeIds: ['oxygen_recycler_i'],
  },
] as const;

export const COLONY_SUPPORT_EMERGENCY_ACTION: ColonySupportEmergencyActionDefinition = {
  id: 'emergency_reserve',
  name: 'Emergency Reserve',
  description: 'Spend credits to restore a small utility buffer when any vital utility is depleted.',
  cost: [{ resourceId: 'credits', quantity: 15 }],
  restores: [
    { resourceId: 'energy', quantity: 6 },
    { resourceId: 'water', quantity: 8 },
    { resourceId: 'oxygen', quantity: 6 },
  ],
};

export const STORAGE_UPGRADES: readonly StorageUpgradeDefinition[] = [
  {
    id: 'storage_bay_ii',
    name: 'Storage Bay II',
    description: 'Expand the cargo floor to support a second production wave.',
    cost: [{ resourceId: 'credits', quantity: 40 }],
    capacityDelta: 8,
  },
  {
    id: 'storage_bay_iii',
    name: 'Storage Bay III',
    description: 'Unlock a wider inventory buffer for stacked contracts and shipments.',
    cost: [{ resourceId: 'credits', quantity: 65 }],
    capacityDelta: 8,
    requiresUpgradeIds: ['storage_bay_ii'],
  },
] as const;