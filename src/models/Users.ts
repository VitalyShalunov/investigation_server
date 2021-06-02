import { Collection, Db, ObjectID, ObjectId } from 'mongodb';
import { db } from "../database/db";
import { IRequest, IResponse, IController, IClients, ICar, ListTypeRequests, ResponseStatuses } from "../interfaces/interface";
import { autoIncrement } from "./autoIncrement.utils";

export default class User implements IController {
    private collection: Collection<IClients>;

    private responseObjectForOptions: IResponse = {
        status: 204,
        data: []
    };

    constructor(private requestDate: IRequest, private database: Db) {
        this.collection = database.collection<IClients>('users');
    }

    private GetUserObjectFromRequest = async (): Promise<IClients> => {
        const { body, params } = this.requestDate;

        const objId = await autoIncrement(this.database, 'users', 'id');
        
        const user: IClients = {
            _id: this.requestDate.typeRequest === ListTypeRequests['POST'] ? new ObjectId(objId._id) : undefined,
            id: body.id || (params[0] && params[0].id) || objId.id,
            login: body.login || null,
            password: body.password || null,
            firstName: body.firstName,
            lastName: body.lastName,
            dateOfBirthday: new Date(body.dateOfBirthday),
            dateUpdated: body.dateUpdated || new Date(),
            cars: body.cars || []
        }
        
        return user;
    }

    private getList = () => new Promise<IResponse>((resolve, reject) => {
        try {
            this.collection.find()
            // .aggregate([
            //     {"$lookup":{
            //         "from":"cars",
            //         "localField":"id",
            //         "foreignField":"userId",
            //         "as":"cars"
            //     }}
            // ])
            .toArray((err: any, result: any) =>{
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

    //#region example with agregation
    private putCarToUser = () => new Promise<IResponse>((resolve, reject) => {
        console.log('putCartoUser');
        try {
            this.collection.aggregate([
                {"$match": {"id": 1}},
                {"$lookup":{
                    "from":"cars",
                    "localField":"id",
                    "foreignField":"userId",
                    "as":"cars"
                }}
            ]).toArray((err, result) =>{
                if (err) {
                    console.log('err', err);
                }

                resolve({
                    status: 200,
                    data: result,
                })
            });
        } catch (error) {
            console.log('error', error);
            throw new Error(`Unable to put car to user`);
        }
    });
    //#endregion

    private get = (id: number) => new Promise<IResponse>((resolve) => {
        console.log(`getById = ${id}`);

        const details = { 'id': id };

        this.collection.find(details)
        // .aggregate([
        //     {"$match": details},
        //     {"$lookup":{
        //         "from":"cars",
        //         "localField":"id",
        //         "foreignField":"userId",
        //         "as":"cars"
        //     }}
        // ])
        .toArray((err, result) =>{
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

        this.GetUserObjectFromRequest().then((userForUpdate: Partial<IClients>) => {
            this.get(id).then((data) => {
                const { data: user } = data;
                
                delete userForUpdate._id;
                userForUpdate = { ...user, ...userForUpdate } as IClients;
                try {
                    this.collection.updateOne({ 'id': id }, { $set: {...userForUpdate}}, function (err, res) {
                        if (err) {
                            resolve({
                                status: 500,
                                data: {},
                            })
                        }
                        resolve({
                            status: 200,
                            data: userForUpdate,
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
        this.GetUserObjectFromRequest().then((user) => {
            user.dateCreated = new Date();
            const objId = user._id;
            delete user._id;
            console.log('user', user);
            
            this.collection.insertOne(user, (err, result) => {
                if (err) {
                    resolve({
                        status: 500,
                        data: [],
                    })
                }
                this.collection.deleteOne({_id: objId})
                resolve({
                    status: 200,
                    data: user || {},
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
                    .catch(console.log)
                : resolve(this.responseObjectForOptions);
            return;
        }
        if (!Number.isNaN(Number(path[0]))) {
            isNeedExecute ?
                this.get(Number(path[0])).then(resolve)
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

    public async define(): Promise<IResponse> {
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
                status: 500,
                data: []
            }
        }
    }
}