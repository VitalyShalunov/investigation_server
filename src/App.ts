
import { createServer, IncomingMessage, Server, ServerResponse } from 'http';
import { Application } from './DynamicClass';
import { IApplicationConfig, IRequest, IResponse, ListTypeRequests } from './interfaces/interface';
import fs = require('fs');
import { createSecureServer, Http2ServerRequest, Http2ServerResponse } from 'http2';

export default class App {
    private static app: App;

    public static getInstance(): App {
        return App.app;
    }

    public static server: Server;

    constructor(private config: IApplicationConfig) {
        this.config = config;
        App.app = this;
    }

    defineParams = (path: string): Record<string, any>[] => {
        if (path.includes('?')) {
            // defined params when request in format ...?id=1..
            let query: Array<Record<string, any>> = [];
            query = path.replace(/.+\?/, '').toString().split('&').map(i => {
                const split = i.split('=');
                const res: any = {};
                if (split) {
                    res[typeof split[0] == 'undefined' ? '' : split[0].toString()] = split[1];
                    return res;
                }
                return {};
            });
            return query;
        } else if (path.includes('/')) {
            const query: Array<Record<string, any>> = [];

            let arrayPath = path.split("/");
            arrayPath = arrayPath.slice(1); // delete controller

            if (!Number.isNaN(Number(arrayPath[0]))) {
                const id = Number(arrayPath[0]);
                if (!Number.isNaN(id)) { // define id
                    query.push({
                        id: id
                    });

                    arrayPath = arrayPath.slice(1);
                }

                let trigger = 0;

                arrayPath = arrayPath.map((i) => {
                    trigger = trigger === 0 ? 1 : 0;
                    if (trigger) {
                        return i + '=';
                    }
                    return i + '/';
                }).join('').slice(0, -1).split('/');
                //users/1/type=2/number=12

                if (arrayPath.length > 0 && arrayPath.length % 2 === 0) {
                    //query = 
                    query.concat(arrayPath.map((i) => { // defined params in arrays of pbject
                        const split = i.split('=');
                        const res: any = {};
                        if (split) {
                            res[typeof split[0] == 'undefined' ? '' : split[0].toString()] = split[1];
                            return res;
                        }
                        return {};
                    }))
                }
            }
            return query;
        } else {
            return [];
        }
        //return [];
    }

    run(): void {
        //const server = createServer((request: IncomingMessage, response: ServerResponse) => {
        const server = createSecureServer({
            key: fs.readFileSync(`${__dirname}/localhost-privkey.pem`),
            cert: fs.readFileSync(`${__dirname}/localhost-cert.pem`),
            allowHTTP1: true, // Postman doen't support http/2
        }, (request: Http2ServerRequest, response: Http2ServerResponse) => {
            const path: string = request.url ? request.url.toString().replace(/^\/+|\/+$/g, '') : '';

            let body = '';

            request.on('data', chunk => {
                body += chunk.toString(); // convert Buffer to string
            });

            // users?id=1
            // users/1/type/2

            const query: Array<Record<string, any>> = this.defineParams(path);

            request.on('end', () => { // send answer
                const control = path.split("/")[0];
                
                const accessToken = request.headers.authorization && String(request.headers.authorization.slice(7)) || '';
                const resObj: IRequest = {
                    controller: control,
                    path: path,
                    headers: request.headers,
                    typeRequest: ListTypeRequests[request.method || ""],
                    params: query,
                    body: body !== '' ? JSON.parse(body) : {},
                    accessToken: accessToken === 'undefined' ? '' : accessToken,
                };
                
                let result: IResponse = {
                    data: [],
                    status: 404,
                };

                fs.readdir(`${__dirname}/models/`, async (err: Error | null, files: string[]) => {
                    //if (err) {}
                    console.log('containsClass', files);
                    const containsClass = files.find((i) => i.toLocaleLowerCase().includes(resObj.controller));
                    
                    if (containsClass) {
                        const controller = Application.create(resObj.controller, resObj, this.config.database);
                        if (controller) {
                            result = await controller.define();
                        }

                        response.writeHead(result.status, {
                            'Content-Type': 'application/json',
                            // 'Access-Control-Allow-Origin': 'http://localhost:3000', // show can be answer of server be access code, which was send request from this source
                            'Access-Control-Allow-Origin': '*', // show can be answer of server be access code, which was send request from this source
                            // 'Access-Control-Allow-Credentials': 'true',
                            'Access-Control-Allow-Methods': '*', // this is header's response, which is defined methid or metods which will be access for resources
                            'Access-Control-Allow-Headers': 'Content-Type, authorization',
                        });
                        response.statusCode = result.status;
                        response.write(JSON.stringify(result.data));
                        response.end();
                    } else {
                        response.end(JSON.stringify(result));
                    }
                });
            });
        });

        server.listen(this.config.port, () => {
            console.log(`Server listening on port ${this.config.port}`);
        });
    }
}