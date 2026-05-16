import type { AlertType, GameEventType, ResearchState, RobotState, RobotTaskType } from '../enums';
import type { UnlockRequirement } from './common.models';

export interface RobotDefinition {
  id: string;
  name: string;
  supportedTaskTypes: RobotTaskType[];
}

export interface RobotInstance {
  id: string;
  definitionId?: string;
  state: RobotState;
  currentTaskType?: RobotTaskType;
}

export interface ResearchUnlock {
  targetId: string;
  description: string;
}

export interface ResearchNodeDefinition {
  id: string;
  name: string;
  description?: string;
  requirements?: UnlockRequirement[];
  unlocks: ResearchUnlock[];
}

export interface ResearchNodeInstance {
  id: string;
  definitionId: string;
  state: ResearchState;
  progress: number;
}

export interface GameEventDefinition {
  id: string;
  type: GameEventType;
  description: string;
}

export interface GameEventInstance {
  id: string;
  definitionId?: string;
  type: GameEventType;
  createdAt: string;
  consumed: boolean;
}

export interface Alert {
  id: string;
  type: AlertType;
  message: string;
  createdAt: string;
  dismissed: boolean;
}
