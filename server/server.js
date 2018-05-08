const express = require('express');
const { postgraphile } = require('postgraphile');
const config = require('config');

const pg = config.postgraphile;

const connection = `${pg.protocol}://${pg.username}:${pg.password}@${pg.host}:${pg.port}/${pg.database}`;

const app = express();

app.use(postgraphile(connection, [pg.schema], {
    pgDefaultRole: pg.defaultRole,
    jwtPgTypeIdentifier: pg.jwtTokenIdentifier,
    jwtSecret: pg.jwtSecret,
    graphiql: true
}));

app.use(express.static('dist'));

app.listen(process.env.PORT || 3000);
