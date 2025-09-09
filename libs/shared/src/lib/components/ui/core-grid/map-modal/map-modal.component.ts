import { CommonModule } from '@angular/common';
import { Component, Inject, AfterViewInit, ViewChild } from '@angular/core';
import { MapComponent, MapModule } from '../../map';
import { MapLayersService } from '../../../../services/map/map-layers.service';
import { LayerDatasource } from '../../../../models/layer.model';
import { get } from 'lodash';
import {
  ButtonModule,
  DialogModule,
  IconModule,
  TooltipModule,
} from '@oort-front/ui';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { RestService } from '../../../../services/rest/rest.service';

/**
 * Dialog data interface
 */
interface DialogData {
  field: string;
  item: any;
  datasource: LayerDatasource;
  files: any[];
}

/**
 * Modal to show markers in a map
 */
@Component({
  standalone: true,
  imports: [
    CommonModule,
    DialogModule,
    MapModule,
    IconModule,
    TooltipModule,
    ButtonModule,
  ],
  selector: 'shared-map-modal',
  templateUrl: './map-modal.component.html',
  styleUrls: ['./map-modal.component.scss'],
})
export class MapModalComponent implements AfterViewInit {
  /** Map component */
  @ViewChild(MapComponent) mapComponent?: MapComponent;

  /**
   * Modal to show markers in a map
   *
   * @param dialogRef Reference to the dialog
   * @param mapLayersService Service to create layers
   * @param data Dialog data
   * @param restService Service to make REST API calls
   */
  constructor(
    public dialogRef: DialogRef<MapModalComponent>,
    private mapLayersService: MapLayersService,
    @Inject(DIALOG_DATA) public data: DialogData,
    private restService: RestService
  ) {}

  ngAfterViewInit(): void {
    const mapComponent = this.mapComponent;
    if (!mapComponent) {
      return;
    }
    if (this.data.files) {
      if (this.data.files.length) {
        const shapefile = this.data.files[0];
        const path = `download/file/${shapefile.content}/${this.data.item.id}/${this.data.field}`;
        this.restService
          .get(path, {
            responseType: 'arrayBuffer',
          })
          .subscribe((buffer) => {
            console.log(buffer);
            this.mapLayersService.createShapefileLayer(
              mapComponent.map,
              buffer
            );
          });
      }
      return;
    }
    this.mapLayersService
      .createLayerFromDefinition(
        {
          id: '',
          name: '',
          visibility: true,
          opacity: 1,
          datasource: this.data.datasource,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        mapComponent.injector
      )
      .then((layer) => {
        mapComponent.addLayer(layer);
        const coordinates = get(
          this.data,
          `item[${this.data.datasource.geoField}].geometry.coordinates`,
          []
        );
        mapComponent.map.setView(coordinates.reverse(), 10);
      });
  }
}
