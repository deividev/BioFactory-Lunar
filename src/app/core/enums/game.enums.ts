export enum GameSpeed {
  Paused = 'paused',
  X1 = 'x1',
  X2 = 'x2',
  X4 = 'x4',
}

export enum ResourceCategory {
  Currency = 'currency',
  Utility = 'utility',
  Input = 'input',
  Crop = 'crop',
  Processed = 'processed',
}

export enum QualityTier {
  Standard = 'standard',
  Improved = 'improved',
  Premium = 'premium',
}

export enum CropSlotState {
  Empty = 'empty',
  Planted = 'planted',
  Ready = 'ready',
  Blocked = 'blocked',
}

export enum MachineState {
  Idle = 'idle',
  Running = 'running',
  Completed = 'completed',
  Blocked = 'blocked',
  Offline = 'offline',
}

export enum ContractState {
  Available = 'available',
  Active = 'active',
  Completed = 'completed',
  Failed = 'failed',
}

export enum ShipmentState {
  Pending = 'pending',
  InTransit = 'in_transit',
  Delivered = 'delivered',
  Cancelled = 'cancelled',
}

export enum RobotState {
  Idle = 'idle',
  Working = 'working',
  Charging = 'charging',
  Offline = 'offline',
}

export enum ModuleState {
  Planned = 'planned',
  Building = 'building',
  Active = 'active',
  Disabled = 'disabled',
}

export enum ResearchState {
  Locked = 'locked',
  Available = 'available',
  InProgress = 'in_progress',
  Completed = 'completed',
}

export enum AlertType {
  Info = 'info',
  Warning = 'warning',
  Critical = 'critical',
  Success = 'success',
}

export enum PanelType {
  CommandCenter = 'command_center',
  Greenhouse = 'greenhouse',
  Processing = 'processing',
  Contracts = 'contracts',
  Shipping = 'shipping',
  Storage = 'storage',
  Research = 'research',
  Settings = 'settings',
}

export enum RobotTaskType {
  None = 'none',
  Plant = 'plant',
  Harvest = 'harvest',
  Process = 'process',
  Deliver = 'deliver',
}

export enum ModuleType {
  CommandCenter = 'command_center',
  Greenhouse = 'greenhouse',
  Processing = 'processing',
  Shipping = 'shipping',
  Storage = 'storage',
}

export enum GameEventType {
  ContractCompleted = 'contract_completed',
  CropReady = 'crop_ready',
  MachineFinished = 'machine_finished',
  ShipmentDelivered = 'shipment_delivered',
  ModuleBuilt = 'module_built',
}
