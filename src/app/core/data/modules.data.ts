import { ModuleType } from '../enums';
import type { BaseModuleDefinition } from '../models';

export const MODULE_DEFINITIONS: readonly BaseModuleDefinition[] = [
  {
    id: 'command_center_basic',
    name: 'Basic Command Center',
    type: ModuleType.CommandCenter,
    size: { width: 2, height: 2 },
    buildCost: [{ resourceId: 'credits', quantity: 0 }],
  },
  {
    id: 'greenhouse_basic',
    name: 'Basic Greenhouse',
    type: ModuleType.Greenhouse,
    size: { width: 3, height: 2 },
    buildCost: [{ resourceId: 'credits', quantity: 100 }],
  },
  {
    id: 'processing_basic',
    name: 'Basic Processing Module',
    type: ModuleType.Processing,
    size: { width: 2, height: 2 },
    buildCost: [{ resourceId: 'credits', quantity: 120 }],
  },
  {
    id: 'shipping_hangar_basic',
    name: 'Basic Shipping Hangar',
    type: ModuleType.Shipping,
    size: { width: 2, height: 2 },
    buildCost: [{ resourceId: 'credits', quantity: 100 }],
  },
  {
    id: 'storage_basic',
    name: 'Basic Storage Module',
    type: ModuleType.Storage,
    size: { width: 2, height: 2 },
    buildCost: [{ resourceId: 'credits', quantity: 80 }],
  },
] as const;
