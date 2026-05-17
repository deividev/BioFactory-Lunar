import { Injectable } from '@angular/core';
import { Subject, type Observable } from 'rxjs';

export type PhaserToAngularEvent =
  | { readonly type: 'sceneReady' }
  | { readonly type: 'moduleHovered'; readonly moduleId: string }
  | { readonly type: 'moduleUnhovered'; readonly moduleId: string }
  | { readonly type: 'moduleSelected'; readonly moduleId: string };

export type AngularToPhaserEvent =
  | { readonly type: 'highlightModule'; readonly moduleId: string }
  | { readonly type: 'clearHighlight' };

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
}
