export interface IAuthUser {
    id: number;
    firstName: string;
    lastName: string;
    permission: number;
}

export type TypeExpires = '1h' | '24h';