import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { MapConstructorSettings } from '../ui/map/interfaces/map.interface';
import { UnsubscribeComponent } from '../utils/unsubscribe/unsubscribe.component';
import { MapComponent, MapModule } from '../ui/map';
import { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import { intersect } from '@turf/intersect';
import { union } from '@turf/union';
import { difference } from '@turf/difference';
import { convex } from '@turf/convex';
import { featureCollection } from '@turf/helpers';
import { booleanDisjoint } from '@turf/boolean-disjoint';
import { MapLayersService } from '../../services/map/map-layers.service';
import * as L from 'leaflet';
import { BehaviorSubject } from 'rxjs';
import { AlertModule } from '@oort-front/ui';
import { CommonModule } from '@angular/common';
import Color from 'color';

export type ErrorType = {
  intersection: boolean;
  gaps: boolean;
  overlap: boolean;
  perimeter: boolean;
};
/** Error messages associated to errors */
export const ERROR_MESSAGES: { [key in keyof ErrorType]: string } = {
  intersection:
    'Geometry error: There are one or more self-intersecting polygons (polygons that cross themselves in a figure-eight fashion). Please correct these errors and upload the files again.',
  gaps: 'Geometry error: There are one or more gaps (empty spaces) between zonation polygons. Please correct these errors and upload the files again.',
  overlap:
    'Geometry error: There are one or more overlapping zonation polygons. Please correct these errors and upload the files again.',
  perimeter:
    'Geometry error: There are one or more polygons with an incomplete or open perimeter. Please correct these errors and upload the files again.',
};

/** shapefile map component */
@Component({
  selector: 'shared-shapefile-map',
  templateUrl: './shapefile-map.component.html',
  styleUrls: ['./shapefile-map.component.scss'],
  standalone: true,
  imports: [MapModule, AlertModule, CommonModule],
})
export class ShapeFileMapComponent
  extends UnsubscribeComponent
  implements AfterViewInit
{
  /** Map settings */
  public mapSettings: MapConstructorSettings = {
    initialState: {
      viewpoint: {
        center: {
          latitude: 0,
          longitude: 0,
        },
        zoom: 2,
      },
    },
    worldCopyJump: true,
    controls: {
      download: false,
      legend: true,
      measure: false,
      layer: false,
      search: false,
      lastUpdate: null,
    },
    zoomControl: true,
    basemap: 'Unesco',
  };
  /** Shapefile layer */
  public shapefile?: any;
  /** List of errors */
  public errors = new BehaviorSubject<ErrorType>({
    intersection: false,
    gaps: false,
    overlap: false,
    perimeter: false,
  });
  /** Reference to map component */
  @ViewChild(MapComponent) mapComponent?: MapComponent;

  /** @returns Whether there is an error */
  get hasErrors() {
    return Object.values(this.errors.value).some((value) => value);
  }

  /**
   * Component for displaying the input map
   * of the geospatial type question.
   *
   * @param mapLayersService Shared map layers service
   */
  constructor(private mapLayersService: MapLayersService) {
    super();
  }

  ngAfterViewInit() {
    if (!this.mapComponent || !this.shapefile) {
      return;
    }
    console.log(this.shapefile);
    const reader = new FileReader();
    const map = this.mapComponent.map;
    reader.onload = (e: any) => {
      const arrayBuffer = e.target.result;
      this.mapLayersService.createShapefileLayer(map, arrayBuffer);
    };
    reader.readAsArrayBuffer(this.shapefile);
    return;
    // this.checkGeoJSONIssues();
  }

  /**
   * Checks whether the geoJSON has some issues
   *
   *
   */
  // private checkGeoJSONIssues() {
  //   const map = this.mapComponent?.map;
  //   if (!this.shapefile || !map) {
  //     return;
  //   }
  //   const errors: ErrorType = {
  //     intersection: false,
  //     gaps: false,
  //     overlap: false,
  //     perimeter: false,
  //   };
  //   // Check for overlaps and gaps
  //   const overlaps = [];
  //   const { features } = this.shapefile;

  //   // Check if any open / incomplete perimeters
  //   for (let i = 0; i < features.length; i++) {
  //     const polygonA = features[i];
  //     // Check for open / incomplete perimeters
  //     if (polygonA.geometry.type === 'Polygon') {
  //       polygonA.geometry.coordinates.forEach((ring) => {
  //         const first = ring[0];
  //         const last = ring[ring.length - 1];
  //         if (first[0] !== last[0] || first[1] !== last[1]) {
  //           errors.perimeter = true;
  //         }
  //       });
  //     }
  //     if (polygonA.geometry.type === 'MultiPolygon') {
  //       polygonA.geometry.coordinates.forEach((polygon) => {
  //         polygon.forEach((ring) => {
  //           const first = ring[0];
  //           const last = ring[ring.length - 1];
  //           if (first[0] !== last[0] || first[1] !== last[1]) {
  //             errors.perimeter = true;
  //           }
  //         });
  //       });
  //     }
  //     // Computation can break if turf uses invalid polygons
  //     if (errors.perimeter) {
  //       this.errors.next(errors);
  //       return;
  //     }
  //   }

  //   // Iterate through each pair of polygons
  //   for (let i = 0; i < features.length; i++) {
  //     const polygonA = features[i];
  //     const others = union(
  //       featureCollection(
  //         features.filter(
  //           (f) => f.properties?.Zonation !== polygonA.properties?.Zonation
  //         )
  //       )
  //     );
  //     // Check for gaps
  //     if (others && booleanDisjoint(polygonA, others)) {
  //       errors.gaps = true;
  //     }
  //     for (let j = i + 1; j < features.length; j++) {
  //       const polygonB = features[j];
  //       const polygons = featureCollection([polygonA, polygonB]);

  //       // Check for intersection
  //       const intersection = intersect(polygons);
  //       if (intersection) {
  //         overlaps.push(intersection);
  //       }

  //       // Check for overlap
  //       // if (booleanOverlap(polygonA, polygonB)) {
  //       //   errors.overlap = true;
  //       // }
  //     }
  //   }

  //   // Display overlaps and gaps on the map
  //   const addLayerToMap = (
  //     geoJsonData: FeatureCollection,
  //     color: string,
  //     legendTitle: string
  //   ) => {
  //     const fillOpacity = 0.1;
  //     const layer = L.geoJSON(geoJsonData, {
  //       style: { color, fillOpacity },
  //     }).addTo(map);
  //     const div = L.DomUtil.create('div');
  //     const backgroundColor = Color(color).alpha(fillOpacity).rgb().string();
  //     div.innerHTML = `<div class="flex items-center">
  //                         <i class="w-6 h-4 border"
  //                           style="background:${backgroundColor}; border-color:${color}"></i>
  //                         <span class="ml-2">${legendTitle}</span>
  //                       </div>
  //                     `;
  //     const legend = div.outerHTML;
  //     (map as any).legendControl.addLayer(layer, legend);
  //   };

  //   const overlapsLayer =
  //     overlaps.length > 2
  //       ? [
  //           union(featureCollection(overlaps)) as Feature<
  //             Polygon | MultiPolygon
  //           >,
  //         ]
  //       : overlaps;
  //   if (overlapsLayer.length > 0) {
  //     addLayerToMap(
  //       featureCollection(overlapsLayer),
  //       '#ff0000',
  //       'Intersections'
  //     );
  //     errors.intersection = true;
  //   }

  //   if (errors.gaps) {
  //     const convexHull = convex(this.shapefile, { concavity: 1 });
  //     const merged = union(
  //       featureCollection(
  //         this.shapefile.features.map(
  //           (f) => convex(f) as Feature<Polygon | MultiPolygon>
  //         )
  //       )
  //     );
  //     if (merged && convexHull) {
  //       const gap = difference(featureCollection([convexHull, merged]));
  //       if (gap) {
  //         addLayerToMap(featureCollection([gap]), '#000000', 'Gaps');
  //       }
  //     }
  //   }

  //   this.errors.next(errors);
  // }
}
