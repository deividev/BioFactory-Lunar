import { TestBed } from '@angular/core/testing';

import { Processing } from './processing';

describe('Processing Angular component', () => {
  it('renders state-backed machine placeholders and recipe count', async () => {
    await TestBed.configureTestingModule({
      imports: [Processing],
    }).compileComponents();

    const fixture = TestBed.createComponent(Processing);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Processing placeholder online');
    expect(text).toContain('Recipes available');
    expect(text).toContain('3');
    expect(text).toContain('Botanical Extractor');
    expect(text).toContain('Orbital Packager');
    expect(text).toContain('idle');
  });
});
