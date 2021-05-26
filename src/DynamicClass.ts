import { Db } from 'mongodb';
import { IController, IRequest } from './interfaces/interface';
import User from './models/Users';
import Car from './models/Cars';
import Auth from './models/Auth';
export const Store: any = {
    User,
    Car,
    Auth,
}

export class Application {
    public static create(controller: string, obj: IRequest, db: Db): IController | null {
        console.log('controller', controller);
        
        switch (controller) {
            case 'users':
                return new User(obj, db)
            case 'cars':
                return new Car(obj, db)
            case 'auth':
                return new Auth(obj, db)
            default:
                return null;
        }
    }
}

