'use strict';

// Load modules

const Bell = require('../../');
const { expect } = require('code');
const { Server } = require('hapi');
const Hoek = require('hoek');
const Lab = require('lab');
const Mock = require('../mock');


// Test shortcuts

const { describe, it } = exports.lab = Lab.script();


describe('mixer', () => {

    it('authenticates with mock', {
        parallel: false
    }, async () => {

        const mock = new Mock.V2();
        const provider = await mock.start();

        const server = Server({
            host: 'localhost',
            port: 80
        });
        await server.register(Bell);



        const custom = Bell.providers.mixer();
        Hoek.merge(custom, provider);

        const profile = {
            id: 930,
            username: 'Mappa',
            email: 'mappa@example.com'
        };

        Mock.override('https://mixer.com/api/v1/users/current', profile);

        server.auth.strategy('custom', 'bell', {
            password: 'cookie_encryption_password_secure',
            isSecure: false,
            clientId: 'mixer',
            clientSecret: 'secret',
            provider: custom
        });

        server.route({
            method: '*',
            path: '/login',
            config: {
                auth: 'custom',
                handler: function (request, h) {

                    return request.auth.credentials;
                }
            }
        });

        const res = await server.inject('/login');

        const cookie = res.headers['set-cookie'][0].split(';')[0] + ';';
        const mockRes = await mock.server.inject(res.headers.location);

        const response = await server.inject({
            url: mockRes.headers.location,
            headers: {
                cookie
            }
        })

        Mock.clear();
        expect(response.result).to.equal({
            provider: 'custom',
            token: '456',
            expiresIn: 3600,
            refreshToken: undefined,
            query: {},
            profile
        });

        await mock.stop();
    });
});
