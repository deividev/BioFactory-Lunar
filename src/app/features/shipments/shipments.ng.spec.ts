import { TestBed } from '@angular/core/testing';

import { Shipments } from './shipments';

describe('Shipments Angular component', () => {
  it('renders state-backed shipment count and MVP catalog placeholders', async () => {
    await TestBed.configureTestingModule({
      imports: [Shipments],
    }).compileComponents();

    const fixture = TestBed.createComponent(Shipments);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Shipments placeholder online');
    expect(text).toContain('Active shipments');
    expect(text).toContain('Protein Leaf Seed Pack');
    expect(text).toContain('Basic Nutrient Pack');
  });
});
