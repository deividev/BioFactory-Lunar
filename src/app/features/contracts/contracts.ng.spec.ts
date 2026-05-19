import { TestBed } from '@angular/core/testing';

import { Contracts } from './contracts';

describe('Contracts Angular component', () => {
  it('renders state-backed contract placeholders', async () => {
    await TestBed.configureTestingModule({
      imports: [Contracts],
    }).compileComponents();

    const fixture = TestBed.createComponent(Contracts);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Contracts placeholder online');
    expect(text).toContain('Available contracts');
    expect(text).toContain('6');
    expect(text).toContain('Starter Biofood Delivery');
    expect(text).toContain('available');
  });
});
