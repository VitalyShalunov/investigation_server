import { Collection, Db } from "mongodb";
import { generateAccessToken, generateRefreshToken, updateToken, verifyToken } from "../auth/auth";
import { IAuthUser } from "../interfaces/auth.interface";
import { IController, IRequest, IResponse, IUser, ListTypeRequests } from "../interfaces/interface";

export default class Auth implements IController {
    private collection: Collection<IUser>;

    private responseObjectForOptions: IResponse = {
        status: 204,
        data: []
    };

    constructor(private requestData: IRequest, private database: Db) {
        this.collection = database.collection<IUser>('users');
    }

    private findUserByLoginAndPwd = (login: string, password: string) => new Promise<any>((resolve, reject) => {
        this.collection.findOne({ login, password }, (error, user) => {
            if (error) {
                reject(error);
            } else {
                resolve(user);
            }
        })
    });

    // Promise<boolean>
    private login = () => new Promise<IResponse>((resolve, reject) => {
        const {
            login,
            password
        } = this.requestData.body;

        if (login && password) {
            this.findUserByLoginAndPwd(login, password)
                .then(((user) => {
                    if (user) {
                        // reject
                        resolve({
                            status: 200,
                            data: user
                        })
                    } else {
                        // may be 400
                        resolve({
                            status: 404,
                            data: ['login or/and password are empty']
                        })
                    }
                }))
                .catch(reject);
        } else {
            resolve({
                status: 400,
                data: ['login or/and password are empty']
            })
        }
    });


    private generateAccessRefreshTokens = (dataUser: IAuthUser) => new Promise<IResponse>((resolve, reject) => {
        let access = '';
        let refresh = '';

        Promise.allSettled([
                generateAccessToken(dataUser as IAuthUser),
                generateRefreshToken({
                    id: dataUser.id,
                    permission: dataUser.permission
                } as IAuthUser)
            ])
            .then((result: PromiseSettledResult<string>[]) => {
                [access, refresh] = result.map((promiseResult: PromiseSettledResult<string>) => {
                    if (promiseResult.status === 'fulfilled') {
                        // PromiseFulfilledResult<string>
                        return promiseResult.value;
                    } else {
                        reject({
                            status: 500,
                            error: promiseResult.reason,
                        });
                        return '';
                    }
                });
                const updatedAt = new Date().toISOString();
                this.collection.updateOne({ id: dataUser.id },  { $set: { updatedAt }});
                resolve({
                    status: 200,
                    data: {
                        access,
                        refresh,
                    },
                });
            })
            .catch(reject);
    });

    // sha3 - hash algrorithm
    public Post = (path: string[], needExecute: boolean): Promise<IResponse> => new Promise<IResponse>((resolve, reject) => {
        if (path.length == 0) {
            resolve ({
                status: 404,
                data: []
            })
        } else if (path[0] === 'login') {
            if (!needExecute) {
                resolve(this.responseObjectForOptions);
            } else {
                this.login()
                    .then((responseUser) => {
                        if (responseUser.status !== 200) {
                            throw new Error(responseUser.data)
                        }
                        // permission delete from request
                        this.generateAccessRefreshTokens(responseUser.data).then(resolve);
                    })
                    .catch(reject);
            }
            
        } else if (path[0] === 'token') {
            if ((this.requestData.body.refreshToken)) {
                // updateToken(this.requestData.body.refreshToken);
                verifyToken(this.requestData.body.refreshToken)
                    .then(() => {
                        const userId = this.requestData.body.id;
                        this.collection.findOne({ id: userId })
                            .then((user) => {
                                if (user) {
                                    this.generateAccessRefreshTokens(user)
                                        .then(resolve);
                                }
                            })
                    });
            }
        } else if (path[0] === 'is-authorizations') {
            // check token
            verifyToken(this.requestData.body.refreshToken)
                .then((token) => {
                    const {
                        id,
                        exp,
                    } = token;
                    
                    if (id === this.requestData.body.id
                        && new Date(Number(exp) * 1000).getTime() > new Date().getTime()
                    ) {
                        resolve ({
                            data: 'authorizated',
                            status: 200,
                        });
                    } else {
                        reject({
                            status: 401,
                        })
                    }
                })
                .catch((err) => {
                    reject({
                        error: err,
                        status: 500,
                    })
                });

        } else {
            resolve ({
                status: 404,
                data: []
            })
        }
    });

    public async define(): Promise<IResponse> {
        const path = this.requestData.path.split('/').splice(1);
        
        try {
            const executeRequest = async (type: ListTypeRequests, isOption: boolean): Promise<IResponse> => {
                switch (type) {
                    // case 'GET':
                    //     break;
                    //     //return await this.Get(path, !isOption);
                    // case 'PUT':
                    //     break;
                    //     //return this.Put(path, !isOption);
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
            if (this.requestData.typeRequest === 'OPTIONS') {
                if (this.requestData.headers["access-control-request-method"]) {
                    return await executeRequest(ListTypeRequests[this.requestData.headers["access-control-request-method"]], true);
                } else {
                    return new Promise((resolve) => resolve({
                        status: 404,
                        data: []
                    }))
                }
            } else {
                return await executeRequest(this.requestData.typeRequest, false);
            }
        } catch (error) {
            return {
                status: 500,
                data: error
            }
        }
    }
}