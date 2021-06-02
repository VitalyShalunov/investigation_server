import { Collection, Db, ObjectId } from 'mongodb';
import { VerifiedToken, verifyToken } from '../auth/auth';
import { IRequest, IResponse, IController, ICar, ListTypeRequests } from "../interfaces/interface";
import { Permission, verifyHaveNoPermission } from '../permission';
import { autoIncrement } from "./autoIncrement.utils";

export default class Car implements IController {
    private collection: Collection<ICar>;
    private responseObjectForOptions: IResponse = {
        status: 204,
        data: []
    };
    private response401: IResponse = {
        status: 401,
        data: 'Unauthorized',
    };

    private response403: IResponse = {
        status: 403,
        data: 'You haven\'t enough permission',
    };

    private decodedToken: VerifiedToken;

    constructor(private requestDate: IRequest, private database: Db) {
        this.collection = database.collection<ICar>('cars');
        
        this.decodedToken = {
            permission: 0,
        } as VerifiedToken;
    }

    private GetCarObjectFromRequest = async (): Promise<ICar> => {
        const { body, params } = this.requestDate;
        console.log('body', body);
        
        const objId = await autoIncrement(this.database, 'cars', 'id');

        const car: ICar = {
            _id: this.requestDate.typeRequest === ListTypeRequests['POST'] ? new ObjectId(objId._id) : undefined,
            id: body.id || (params[0] && params[0].id) || objId.id,
            model: body.model,
            manufacturer: body.manufacturer
        }
        return car;
    }

    private getList = () => new Promise<IResponse>((resolve, reject) => {
        const {
            permission,
        } = this.decodedToken;

        console.log('permission', permission);
        
        if (!this.decodedToken.id) {
            reject(this.response401);
            return;
        }
        if (verifyHaveNoPermission(permission, Permission.GetCars)) {
            reject(this.response403);
            return;
        }
        try {
            this.collection.find().toArray((err, result) =>{
                if (err) {
                    resolve({
                        status: 500,
                        data: []
                    });
                }
                resolve({
                    status: 200,
                    data: result,
                })
            });

        } catch (error) {
            resolve({
                status: 500,
                data: []
            });
            console.log('error', error);
        }
    });


    private get = (id: number) => new Promise<IResponse>((resolve) => {
        console.log(`getById = ${id}`);

        const details = { 'id': id };

        this.collection.find(details).toArray((err, result) =>{
            if (err) {
                console.log('err', err);
            }

            resolve({
                status: 200,
                data: result[0] || {},
            })
        });
    });

    private update = (id: number) => new Promise<IResponse>((resolve) => {
        console.log(`update = ${id}`);

        this.GetCarObjectFromRequest()
            .then((carForUpdate) => {
                this.get(id).then((data) => {
                    const { data: car } = data;
                    
                    delete carForUpdate._id;
                    carForUpdate = { ...car, ...carForUpdate } as ICar;
                    try {
                        this.collection.updateOne({ 'id': id }, { $set: {...carForUpdate}}, function (err, res) {
                            if (err) {
                                resolve({
                                    status: 500,
                                    data: {},
                                })
                            }
                            resolve({
                                status: 200,
                                data: carForUpdate,
                            })
                        });
                    } catch (error) {
                        resolve({
                            status: 500,
                            data: [],
                        })
                    }
                })
            });
    });

    private create = () => new Promise<IResponse>((resolve, reject) => {
        this.GetCarObjectFromRequest()
            .then((car) => {

                const objId = car._id;
                delete car._id;

                this.collection.insertOne(car, (err, result) => {
                    if (err) {
                        resolve({
                            status: 500,
                            data: [],
                        })
                    }

                    this.collection.deleteOne({ _id: objId })
                    resolve({
                        status: 200,
                        data: car || {},
                    })
                });
            });
    });

    private delete = (id: number) => new Promise<IResponse>((resolve, reject) => {
        this.get(id).then((deletedUser) => {
            console.log('deletedUser', deletedUser);
            
            this.collection.deleteOne({ 'id': id}, function(err, obj) {
                if (err) {
                    resolve({
                        status: 500,
                        data: [],
                    })
                }
                resolve({
                    status: 200,
                    data: deletedUser.data,
                })
              });
        });
    });

    private Get = (path: string[], isNeedExecute: boolean) => new Promise<IResponse>((resolve, reject) => {
        if (path.length == 0) {
            isNeedExecute ?
                this.getList().then(resolve)
                    .catch(reject)
                : resolve(this.responseObjectForOptions);
            return;
        }
        resolve({
            status: 404,
            data: []
        })
    });

    private Post = (path: string[], isNeedExecute: boolean) => new Promise<IResponse>((resolve, reject) => {
        if (path.length == 0) {
            isNeedExecute ? this.create().then(resolve) : resolve(this.responseObjectForOptions);
            return;
        }
        resolve({
            status: 404,
            data: []
        })
    });

    private Put = (path: string[], isNeedExecute: boolean) => new Promise<IResponse>((resolve, reject) => {
        if (!Number.isNaN(Number(path[0]))) {
            isNeedExecute ? this.update(Number(path[0])).then(resolve) : resolve(this.responseObjectForOptions);
            return;
        }
        resolve({
            status: 404,
            data: []
        })
    });

    private Delete = (path: string[], isNeedExecute: boolean) => new Promise<IResponse>((resolve, reject) => {
        if (!Number.isNaN(Number(path[0]))) {
            isNeedExecute ? this.delete(Number(path[0])).then(resolve) : resolve(this.responseObjectForOptions);
            return;
        }
        resolve({
            status: 404,
            data: []
        })
    });

    private checkAuthorizationAndPermission = async () => {
        const { headers: { authorization } } = this.requestDate;
        if (authorization) {
            const token = authorization.slice(authorization.indexOf(' ') + 1);
            if (token) {
                verifyToken(token).then((data) => {
                    console.log(data);
                    
                    this.decodedToken = data;
                });
            }
        }
    };

    public async define(): Promise<IResponse> {
        await this.checkAuthorizationAndPermission();
        const path = this.requestDate.path.split('/').splice(1);

        try {
            const executeRequest = async (type: ListTypeRequests, isOption: boolean): Promise<IResponse> => {
                switch (type) {
                    case 'GET':
                        return await this.Get(path, !isOption);
                    case 'DELETE':
                        return await this.Delete(path, !isOption);
                    case 'PUT':
                        return this.Put(path, !isOption);
                    case 'POST':
                        return await this.Post(path, !isOption);
                    case 'OPTIONS':
                        return {
                            status: 404,
                            data: {}
                        }
                    default:
                        return {
                            status: 404,
                            data: []
                        }
                }
            }
            if (this.requestDate.typeRequest === 'OPTIONS') {
                if (this.requestDate.headers["access-control-request-method"]) {
                    return await executeRequest(ListTypeRequests[this.requestDate.headers["access-control-request-method"]], true);
                } else {
                    return new Promise((resolve) => resolve({
                        status: 404,
                        data: []
                    }))
                }
            } else {
                return await executeRequest(this.requestDate.typeRequest, false);
            }
        } catch (error) {
            return {
                status: error.status,
                data: error.data,
            }
        }
    }
}