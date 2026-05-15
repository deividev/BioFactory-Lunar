import { TestBed } from '@angular/core/testing';
import { PhaserGame, PHASER_GAME_FACTORY } from './phaser-game';

describe('PhaserGame Angular component', () => {
  it('starts Phaser after Angular creates the host element and destroys it on teardown', async () => {
    const events: string[] = [];

    await TestBed.configureTestingModule({
      imports: [PhaserGame],
      providers: [
        {
          provide: PHASER_GAME_FACTORY,
          useValue: (parent: string) => {
            events.push(`start:${parent}`);
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

    expect(events).toEqual(['start:phaser-container', 'destroy:true']);
  });
});
