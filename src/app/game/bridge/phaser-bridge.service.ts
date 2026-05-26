import { Injectable } from '@angular/core';
import { Subject, type Observable } from 'rxjs';

import type { ModuleLayoutPatch } from '../phaser/scenes/main-base-layout.config';

export type PhaserToAngularEvent =
  | { readonly type: 'sceneReady' }
  | { readonly type: 'moduleHovered'; readonly moduleId: string }
  | { readonly type: 'moduleUnhovered'; readonly moduleId: string }
  | { readonly type: 'moduleSelected'; readonly moduleId: string };

export type AngularToPhaserEvent =
  | { readonly type: 'highlightModule'; readonly moduleId: string }
  | { readonly type: 'clearHighlight' }
  | { readonly type: 'adjustModuleLayout'; readonly moduleId: string; readonly patch: ModuleLayoutPatch }
  | { readonly type: 'cropReady'; readonly moduleId: string }
  | { readonly type: 'playObjectivePulse' }
  | { readonly type: 'playCompletionPulse' }
  | { readonly type: 'clearDemoPulse' };

@Injectable({ providedIn: 'root' })
export class PhaserBridgeService {
  private readonly phaserEventsSubject = new Subject<PhaserToAngularEvent>();
  private readonly angularEventsSubject = new Subject<AngularToPhaserEvent>();

  readonly phaserEvents$: Observable<PhaserToAngularEvent> = this.phaserEventsSubject.asObservable();
  readonly angularEvents$: Observable<AngularToPhaserEvent> = this.angularEventsSubject.asObservable();

  emitFromPhaser(event: PhaserToAngularEvent): void {
    this.phaserEventsSubject.next(event);
  }

  sendToPhaser(event: AngularToPhaserEvent): void {
    this.angularEventsSubject.next(event);
  }

  highlightModule(moduleId: string): void {
    this.sendToPhaser({ type: 'highlightModule', moduleId });
  }

  clearHighlight(): void {
    this.sendToPhaser({ type: 'clearHighlight' });
  }

  sendModuleLayoutAdjust(moduleId: string, patch: ModuleLayoutPatch): void {
    this.sendToPhaser({ type: 'adjustModuleLayout', moduleId, patch });
  }

  notifyCropReady(moduleId: string): void {
    this.sendToPhaser({ type: 'cropReady', moduleId });
  }

  playObjectivePulse(): void {
    this.sendToPhaser({ type: 'playObjectivePulse' });
  }

  playCompletionPulse(): void {
    this.sendToPhaser({ type: 'playCompletionPulse' });
  }

  clearDemoPulse(): void {
    this.sendToPhaser({ type: 'clearDemoPulse' });
  }
}
