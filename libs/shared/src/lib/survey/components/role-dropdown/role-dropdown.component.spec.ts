import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RoleDropdownComponent } from './role-dropdown.component';

describe('RoleDropdownComponent', () => {
  let component: RoleDropdownComponent;
  let fixture: ComponentFixture<RoleDropdownComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoleDropdownComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RoleDropdownComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
