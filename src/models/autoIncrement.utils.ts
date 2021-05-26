import { Collection, Db, FilterQuery, ObjectId, ObjectID } from "mongodb";

interface IMongo {
    _id: ObjectId;
}

//function getNextSequenceValue<T extends IMongo>(sequenceName: string, collection: Collection<T> ){
// return new Promise((resolve, reject) => {
//     //const filter = { _id: new ObjectId(sequenceName) };
//     const filter = { "_id": new ObjectId(sequenceName) };
//     const update = { $inc: { sequence_value: 1 } };
//     collection.findOneAndUpdate(
//             filter,
//             update,
//             (err: any, res: any) => {
//         if (err) {
//             reject(err);
//         }
//         resolve(res);
//     });
// }).then((document: any) => { 
//     return document.sequence_value;
// });
//}

// export function getNextSequence(collection: any, name: string, callback: Function) {
//     collection.findAndModify( { _id: name }, null, { $inc: { seq: 1 } }, (err: any, res: any) => {
//         if(err) callback(err, res);
//         console.log('res-auto', res);

//         callback(err, res.value.seq);
//     } );
// }

// export function getNextSequenceValue<T extends IMongo>(collection: Collection<T>) {
//     //type type_id = Pick<{ [P in keyof T]: T[P] }, '_id'>;
    
//     return new Promise((resolve, reject) => {
//         //const filter = { _id: new ObjectId(sequenceName) };
//         //const filter = { "_id": new ObjectId(sequenceName) };
//         const filter: FilterQuery<T> = { _id: new ObjectId() };
//         // type type_id = { [P in keyof IMongo]: IMongo[P] };
//         // const filter: type_id = { _id: new ObjectId() };
//         const update = { $inc: { id: 1 } };
//         collection.findOneAndUpdate(
//             filter,
//             update,
//             {
//                 upsert: true,
//                 //new: true
//             },
//             (err: any, res: any) => {
//                 if (err) {
//                     reject(err);
//                 }
//                 resolve(res);
//             }
//         )
//     }).then((document: any) => {
//         console.log('_id', document);
//         return new ObjectId(document.lastErrorObject.upserted);
//     });
// }

const defaultCollectionName = 'counters';
const defaultStep = 1;

interface Options {
    collectionName?: string
    step?: number
    filter?: object
}

interface IAutoIncrement {
    _id: string,
    id: number,
}
export async function autoIncrement(
    db: Db,
    collection: string,
    field: string,
    { filter, collectionName = defaultCollectionName, step = defaultStep }: Options = {},
): Promise<IAutoIncrement> {
    const result = await db.collection(collectionName).findOneAndUpdate(
        {
            collection,
            field,
            ...filter,
        },
        { $inc: { current: step },
        },
        { upsert: true, returnOriginal: false, },
    )
    return {
        id: result.value.current,
        _id: result.value._id
    } as IAutoIncrement;
}