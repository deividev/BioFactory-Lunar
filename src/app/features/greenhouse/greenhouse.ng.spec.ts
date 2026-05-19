import { TestBed } from '@angular/core/testing';

import { Greenhouse } from './greenhouse';

describe('Greenhouse Angular component', () => {
  it('renders state-backed crop slots and MVP crop catalog placeholders', async () => {
    await TestBed.configureTestingModule({
      imports: [Greenhouse],
    }).compileComponents();

    const fixture = TestBed.createComponent(Greenhouse);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Greenhouse placeholder online');
    expect(text).toContain('Crop slots');
    expect(text).toContain('crop_slot_01');
    expect(text).toContain('Protein Leaf');
    expect(text).toContain('Aqua Sprout');
    expect(text).toContain('Luma Moss');
  });
});
