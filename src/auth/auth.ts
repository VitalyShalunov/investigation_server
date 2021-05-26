import fs from 'fs';
import jwt from 'jsonwebtoken';
import { IAuthUser, TypeExpires } from '../interfaces/auth.interface';

const privateKey = fs.readFileSync(`${__dirname}/jwtRS256.key`);
const publicKey = fs.readFileSync(`${__dirname}/jwtRS256.key.pub`);

type ErrToken = jwt.JsonWebTokenError | jwt.NotBeforeError | jwt.TokenExpiredError | null;
// type VerifiedToken = jwt.VerifyCallback;
interface IDecoded {
    expiredAt: Date,
}

export interface VerifiedToken {
    _id: string,
    id: number,
    iat: number,
    exp: number,
    firstName: string,
    lastName: string,
    dateOfBirthday: string,
    dateUpdated: string,
    cars: [],
    dateCreated: string,
    login: string,
    password: string,
    updatedAt: string,
    permission: number,
}

export const verifyToken = (token: string) => new Promise<VerifiedToken>((resolve, reject) => {
    jwt.verify(token, publicKey, (err: ErrToken, decoded: any | undefined) => {
        if (err || !decoded) {
            reject(err || 'empty')
        } else {
            resolve(decoded);
        }
    });
});

export const generateAccessToken = (data: IAuthUser): Promise<string> => {
    const {
        permission,
        ...dataWithoutPermission
    } = data;
    return sign(permission, dataWithoutPermission, '1h');
};

export const generateRefreshToken = (data: IAuthUser): Promise<string> => sign(data.permission, { id: data.id }, '24h');

export const sign = (permission: number, data: Partial<IAuthUser>, expiresIn: TypeExpires): Promise<string> => new Promise((resolve, reject) => {
    jwt.sign(
        {
            ...data,
            permission,
        },
        privateKey,
        {
            algorithm: 'RS256',
            expiresIn: expiresIn,
        },
        (err, encoded) => {
            if (err || !encoded) {
                reject();
            } else {
                resolve(encoded);
            }
        }
    );
});

export const updateToken = (refreshToken: string) => 'update';

// refresh token