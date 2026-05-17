import { ModuleType, PanelType } from '../enums';

export const MODULE_PANEL_BY_TYPE: Readonly<Record<ModuleType, PanelType>> = {
  [ModuleType.CommandCenter]: PanelType.CommandCenter,
  [ModuleType.Greenhouse]: PanelType.Greenhouse,
  [ModuleType.Processing]: PanelType.Processing,
  [ModuleType.Shipping]: PanelType.Shipping,
  [ModuleType.Storage]: PanelType.Storage,
};
