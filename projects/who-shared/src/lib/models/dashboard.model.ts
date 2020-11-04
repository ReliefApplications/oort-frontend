/*  Model for Dashboard object.
*/
export interface Dashboard {
    id?: string;
    name?: string;
    createdAt?: Date;
    modifiedAt?: Date;
    structure?: any;
    permissions?: any;
    canSee?: boolean;
    canCreate?: boolean;
    canUpdate?: boolean;
    canDelete?: boolean;
}
