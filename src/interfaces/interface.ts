import { IncomingHttpHeaders } from "http";
import { Db, ObjectId, ObjectID } from "mongodb";
//import { ObjectId } from "mongoose";

  
export interface IApplicationConfig {
    port: number,
    database: Db
}

export type ListTypeRequests = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'OPTIONS' | '';

export const ListTypeRequests: { [key: string]: ListTypeRequests } = {
    GET: 'GET',
    POST: 'POST',
    PUT: 'PUT',
    DELETE: 'DELETE',
    OPTIONS: 'OPTIONS',
    UNDEFINED: '',
  };
  
export interface IRequest {
    controller: string,
    path: string,
    typeRequest: ListTypeRequests,
    params: any,
    body: any,
    headers: IncomingHttpHeaders,
}

export type ResponseStatuses = 
    200 | // ok
    204 | // no content
    400 | // bad request
    401 | // unauthorized
    403 | // not enough permission
    404 | // not found
    500 // internal server error

export interface IResponse {
    status: ResponseStatuses;
    data: any; //string
}

interface IObjectMongo {
    _id?: ObjectId
}

export interface IClients extends IObjectMongo{
    id: number,
    firstName: string,
    lastName: string,
    dateOfBirthday: Date,
    dateCreated?: Date,
    dateUpdated: Date,
    cars: ICar[],
}

export interface ICar extends IObjectMongo{
    id: number,
    model: string,
    manufacturer: string
}

export interface IController {
    define: () => Promise<IResponse>;
}

export type TypesUser = 'admin';

export const TypesUser: { [key: string]: TypesUser } = {
    Admin: 'admin',
};

export interface IUser extends IObjectMongo {
    id: number;
    login: string;
    password: string;
    firstName: string;
    lastName: string;
    // permission: TypesUser;
    permission: number;
    updatedAt: string;
}