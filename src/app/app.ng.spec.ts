import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { PHASER_GAME_FACTORY } from './game/phaser/phaser-game';
import { GameShell } from './layout/game-shell/game-shell';

@Component({
  selector: 'app-game-shell',
  template: '<section aria-label="Stub game shell">Stub shell online</section>'
})
class StubGameShell {}

describe('App Angular component', () => {
  it('declares the expected root selector and standalone shell dependency', () => {
    const componentDefinition = (App as typeof App & {
      ɵcmp?: {
        selectors?: string[][];
        dependencies?: unknown[];
      };
    }).ɵcmp;

    expect(componentDefinition?.selectors?.[0]?.[0]).toBe('app-root');
    expect(componentDefinition?.dependencies).toContain(GameShell);
  });

  it('composes the game shell through Angular rendering', async () => {
    await TestBed.configureTestingModule({
      imports: [App]
    })
      .overrideComponent(App, {
        remove: { imports: [GameShell] },
        add: { imports: [StubGameShell] }
      })
      .compileComponents();

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Stub shell online');
  });

  it('renders the real game shell composition with a mocked Phaser factory', async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        {
          provide: PHASER_GAME_FACTORY,
          useValue: () => ({ destroy: () => undefined })
        }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;

    expect(text).toMatch(/Biofactory\s+Lunar/);
    expect(text).not.toContain('HUD placeholder online');
    expect(text).not.toContain('Angular shell ready');
  });
});
