import App from './App';
import { MongoClient } from 'mongodb';
import { db } from './database/db';

MongoClient.connect(
    db.url_prod,
    // process.env.CONNECTION_STRING,
    (err, client) => {
        if (err) {
            console.log('Connection error: ', err)
            throw err
        }

        const database = client.db('dbExpress');

        try {
            new App({
                port: 8000,
                database: database
            }).run();
        } catch (e) {
            console.error(e.message);
        }
        console.log('close');
        
        //client.close()
    }
)

