import { TestBed } from '@angular/core/testing';
import type { PhaserSceneBridge } from './scenes/main-base.scene';
import { PhaserGame, PHASER_GAME_FACTORY } from './phaser-game';

describe('PhaserGame Angular component', () => {
  it('starts Phaser with the Angular bridge after Angular creates the host element and destroys it on teardown', async () => {
    const events: string[] = [];

    await TestBed.configureTestingModule({
      imports: [PhaserGame],
      providers: [
        {
          provide: PHASER_GAME_FACTORY,
          useValue: (parent: string, sceneBridge: PhaserSceneBridge) => {
            events.push(`start:${parent}`);
            events.push(`bridge:${typeof sceneBridge.emitFromPhaser}`);
            return {
              destroy: (removeCanvas?: boolean) => events.push(`destroy:${String(removeCanvas)}`)
            };
          }
        }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(PhaserGame);
    fixture.detectChanges();
    fixture.destroy();

    expect(events).toEqual(['start:phaser-container', 'bridge:function', 'destroy:true']);
  });
});
