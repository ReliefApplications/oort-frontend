import { Injector, NgZone } from '@angular/core';
import { DomService } from '../services/dom/dom.service';
import { ComponentCollection } from 'survey-core';
import * as ResourceComponent from './components/resource';
import * as ResourcesComponent from './components/resources';
import * as OwnerComponent from './components/owner';
import * as UsersComponent from './components/users';
import * as GeospatialComponent from './components/geospatial';
import { Apollo } from 'apollo-angular';

/**
 * Custom question types for the survey creator toolbox
 */
export enum CustomQuestionTypes {
  Resource = 'resource',
  Resources = 'resources',
  Owner = 'owner',
  Users = 'users',
  GeoSpatial = 'geoSpatial',
}

/**
 * Init the custom question component
 */
export const InitCustomQuestionComponent: { [key: string]: any } = {
  resource: (
    injector: Injector,
    componentCollection: ComponentCollection,
    ngZone: NgZone,
    document: Document
  ) => {
    ResourceComponent.init(injector, componentCollection, ngZone, document);
  },
  resources: (
    injector: Injector,
    componentCollection: ComponentCollection,
    ngZone: NgZone,
    document: Document
  ) => {
    ResourcesComponent.init(injector, componentCollection, ngZone, document);
  },
  owner: (apollo: Apollo, componentCollection: ComponentCollection) => {
    OwnerComponent.init(apollo, componentCollection);
  },
  users: (apollo: Apollo, componentCollection: ComponentCollection) => {
    UsersComponent.init(apollo, componentCollection);
  },
  geoSpatial: (
    domService: DomService,
    componentCollection: ComponentCollection
  ) => {
    GeospatialComponent.init(domService, componentCollection);
  },
};
