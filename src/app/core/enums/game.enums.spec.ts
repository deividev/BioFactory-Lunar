import { describe, expect, it } from 'vitest';

import {
  AlertType,
  ContractState,
  CropSlotState,
  GameEventType,
  GameSpeed,
  MachineState,
  ModuleState,
  ModuleType,
  PanelType,
  QualityTier,
  ResearchState,
  ResourceCategory,
  RobotState,
  RobotTaskType,
  ShipmentState,
} from './index';

describe('game domain enums', () => {
  it('exports stable lowercase values for economy and simulation state', () => {
    expect(GameSpeed.Paused).toBe('paused');
    expect(GameSpeed.X1).toBe('x1');
    expect(GameSpeed.X2).toBe('x2');
    expect(GameSpeed.X4).toBe('x4');
    expect(ResourceCategory.Currency).toBe('currency');
    expect(QualityTier.Standard).toBe('standard');
    expect(CropSlotState.Empty).toBe('empty');
    expect(MachineState.Idle).toBe('idle');
    expect(MachineState.Completed).toBe('completed');
    expect(ContractState.Available).toBe('available');
    expect(ShipmentState.Pending).toBe('pending');
  });

  it('exports stable lowercase values for modules, UI, automation, and events', () => {
    expect(RobotState.Idle).toBe('idle');
    expect(ModuleState.Active).toBe('active');
    expect(ResearchState.Locked).toBe('locked');
    expect(AlertType.Info).toBe('info');
    expect(PanelType.Greenhouse).toBe('greenhouse');
    expect(PanelType.Contracts).toBe('contracts');
    expect(RobotTaskType.None).toBe('none');
    expect(ModuleType.Greenhouse).toBe('greenhouse');
    expect(GameEventType.ContractCompleted).toBe('contract_completed');
  });
});
