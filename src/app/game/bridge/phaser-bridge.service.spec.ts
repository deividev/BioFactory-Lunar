import { describe, expect, it } from 'vitest';

import {
  PhaserBridgeService,
  type AngularToPhaserEvent,
  type PhaserToAngularEvent,
} from './phaser-bridge.service';

describe('PhaserBridgeService', () => {
  it('publishes typed Phaser-to-Angular module events', () => {
    const service = new PhaserBridgeService();
    const events: PhaserToAngularEvent[] = [];
    const subscription = service.phaserEvents$.subscribe((event) => events.push(event));

    service.emitFromPhaser({ type: 'sceneReady' });
    service.emitFromPhaser({ type: 'moduleHovered', moduleId: 'module_greenhouse_basic_01' });
    service.emitFromPhaser({ type: 'moduleUnhovered', moduleId: 'module_greenhouse_basic_01' });
    service.emitFromPhaser({ type: 'moduleSelected', moduleId: 'module_greenhouse_basic_01' });

    expect(events).toEqual([
      { type: 'sceneReady' },
      { type: 'moduleHovered', moduleId: 'module_greenhouse_basic_01' },
      { type: 'moduleUnhovered', moduleId: 'module_greenhouse_basic_01' },
      { type: 'moduleSelected', moduleId: 'module_greenhouse_basic_01' },
    ]);

    subscription.unsubscribe();
  });

  it('publishes typed Angular-to-Phaser visual commands', () => {
    const service = new PhaserBridgeService();
    const commands: AngularToPhaserEvent[] = [];
    const subscription = service.angularEvents$.subscribe((event) => commands.push(event));

    service.highlightModule('module_processing_basic_01');
    service.clearHighlight();
    service.sendToPhaser({ type: 'highlightModule', moduleId: 'module_storage_basic_01' });

    expect(commands).toEqual([
      { type: 'highlightModule', moduleId: 'module_processing_basic_01' },
      { type: 'clearHighlight' },
      { type: 'highlightModule', moduleId: 'module_storage_basic_01' },
    ]);

    subscription.unsubscribe();
  });

  it('sendModuleLayoutAdjust publishes per-module layout patches', () => {
    const service = new PhaserBridgeService();
    const commands: AngularToPhaserEvent[] = [];
    const subscription = service.angularEvents$.subscribe((event) => commands.push(event));

    service.sendModuleLayoutAdjust('module_processing_basic_01', { xRatio: 0.61, yRatio: 0.88 });

    expect(commands).toEqual([
      { type: 'adjustModuleLayout', moduleId: 'module_processing_basic_01', patch: { xRatio: 0.61, yRatio: 0.88 } },
    ]);

    subscription.unsubscribe();
  });

  it('notifyCropReady sends a cropReady event with the given moduleId', () => {
    const service = new PhaserBridgeService();
    const commands: AngularToPhaserEvent[] = [];
    const subscription = service.angularEvents$.subscribe((event) => commands.push(event));

    service.notifyCropReady('module_greenhouse_basic_01');

    expect(commands).toEqual([{ type: 'cropReady', moduleId: 'module_greenhouse_basic_01' }]);

    subscription.unsubscribe();
  });

  it('publishes demo pulse commands without exposing gameplay ownership to Phaser', () => {
    const service = new PhaserBridgeService();
    const commands: AngularToPhaserEvent[] = [];
    const subscription = service.angularEvents$.subscribe((event) => commands.push(event));

    service.playObjectivePulse();
    service.playCompletionPulse();
    service.clearDemoPulse();

    expect(commands).toEqual([
      { type: 'playObjectivePulse' },
      { type: 'playCompletionPulse' },
      { type: 'clearDemoPulse' },
    ]);

    subscription.unsubscribe();
  });
});
