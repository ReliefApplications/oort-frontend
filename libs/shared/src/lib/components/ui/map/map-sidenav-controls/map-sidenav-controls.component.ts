import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonModule, DividerModule } from '@oort-front/ui';
import { UILayoutService } from '@oort-front/ui';
import { SidenavControlsMenuComponent } from './sidenav-controls-menu/sidenav-controls-menu.component';
import { MapComponent } from '../map.component';

type TreeObject = L.Control.Layers.TreeObject;

/**
 * Map layers component
 */
@Component({
  selector: 'shared-map-sidenav-controls',
  standalone: true,
  imports: [ButtonModule, CommonModule, DividerModule, TranslateModule],
  templateUrl: './map-sidenav-controls.component.html',
  styleUrls: ['./map-sidenav-controls.component.scss'],
})
export class MapSidenavControlsComponent {
  /** Layers tree */
  private layersTree!: TreeObject[];
  /** Basemaps tree */
  private basemaps!: TreeObject[];
  /** Map component */
  private mapComponent!: MapComponent;

  /**
   * Sets the layers tree
   *
   * @param layersTree The layers tree to set
   */
  public setLayersTree(layersTree: TreeObject[]): void {
    this.layersTree = layersTree;
  }

  /**
   * Sets the basemaps tree
   *
   * @param basemaps The basemaps tree to set
   */
  public setBasemaps(basemaps: TreeObject[]): void {
    this.basemaps = basemaps;
  }

  /**
   * Sets the map component
   *
   * @param mapComponent The map component to set
   */
  public setMapComponent(mapComponent: MapComponent): void {
    this.mapComponent = mapComponent;
  }

  /**
   * Map layers component
   *
   * @param layoutService shared layout service
   */
  constructor(private layoutService: UILayoutService) {}

  /** Opens the layers menu */
  openLayersMenu() {
    this.openSidenavMenu(true);
  }

  /**
   * Opens the sidenav menu
   *
   * @param layersMenuExpanded true if we start with the layers expanded
   */
  openSidenavMenu(layersMenuExpanded: boolean) {
    this.layoutService.setRightSidenav({
      component: SidenavControlsMenuComponent,
      inputs: {
        layersMenuExpanded: layersMenuExpanded,
        layersTree: this.layersTree,
        basemaps: this.basemaps,
        mapComponent: this.mapComponent,
      },
    });
  }
}
