// export enum Permission {
//     GetUsers = '1',
//     UpdateUsers = '10',
//     GetCars = '11',
//     UpdateCars = '100',
// }

export enum Permission {
    GetUsers = 1000, // 8
    UpdateUsers = 100, // 4
    GetCars = 10, // 2
    UpdateCars = 1, // 1
}

export const verifyHaveNoPermission = (permissionUser: number, permission: Permission): boolean => (
    (permissionUser % permission || permission) / permission < 1
);
// 1010
// 0001

// 0 // 1
