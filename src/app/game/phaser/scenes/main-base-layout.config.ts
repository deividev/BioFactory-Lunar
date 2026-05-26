export interface ModuleLayoutRatios {
  readonly xRatio: number;
  readonly yRatio: number;
  readonly widthRatio: number;
  readonly heightRatio: number;
  readonly spriteWidthRatio: number;
  readonly spriteHeightRatio: number;
}

export interface ModuleHotspotConfig extends ModuleLayoutRatios {
  readonly id: string;
  readonly label: string;
  readonly spritePath: string;
}

export type ModuleLayoutRatioKey = keyof ModuleLayoutRatios;
export type ModuleLayoutPatch = Partial<ModuleLayoutRatios>;

export const MODULE_LAYOUT_RATIO_KEYS: readonly ModuleLayoutRatioKey[] = [
  'xRatio',
  'yRatio',
  'widthRatio',
  'heightRatio',
  'spriteWidthRatio',
  'spriteHeightRatio',
];

export const MVP_MODULE_HOTSPOTS: readonly ModuleHotspotConfig[] = [
  {
    id: 'module_command_center_basic_01',
    label: 'Command Center',
    xRatio: 0.495,
    yRatio: 0.77,
    widthRatio: 0.15,
    heightRatio: 0.1,
    spriteWidthRatio: 0.26,
    spriteHeightRatio: 0.27,
    spritePath: 'assets/phaser/modules/module_command_center.png',
  },
  {
    id: 'module_greenhouse_basic_01',
    label: 'Greenhouse',
    xRatio: 0.245,
    yRatio: 0.775,
    widthRatio: 0.18,
    heightRatio: 0.11,
    spriteWidthRatio: 0.2,
    spriteHeightRatio: 0.26,
    spritePath: 'assets/phaser/modules/module_greenhouse_basic.png',
  },
  {
    id: 'module_processing_basic_01',
    label: 'Processing',
    xRatio: 0.33,
    yRatio: 0.93,
    widthRatio: 0.16,
    heightRatio: 0.1,
    spriteWidthRatio: 0.24,
    spriteHeightRatio: 0.265,
    spritePath: 'assets/phaser/modules/module_processing.png',
  },
  {
    id: 'module_shipping_hangar_basic_01',
    label: 'Shipping',
    xRatio: 0.755,
    yRatio: 0.775,
    widthRatio: 0.18,
    heightRatio: 0.12,
    spriteWidthRatio: 0.275,
    spriteHeightRatio: 0.36,
    spritePath: 'assets/phaser/modules/module_shipping_hangar.png',
  },
  {
    id: 'module_storage_basic_01',
    label: 'Storage',
    xRatio: 0.63,
    yRatio: 0.93,
    widthRatio: 0.22,
    heightRatio: 0.095,
    spriteWidthRatio: 0.225,
    spriteHeightRatio: 0.305,
    spritePath: 'assets/phaser/modules/module_storage.png',
  },
];