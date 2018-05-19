const express = require('express');
const { postgraphile } = require('postgraphile');
const config = require('config');
const pg = require('pg');

const pgconf = config.postgraphile;
const connection = `postgresql://${pgconf.username}:${pgconf.password}@${pgconf.host}:${pgconf.port}/${pgconf.database}`;

const app = express();

app.use(postgraphile(connection, [pgconf.schema], {
    pgDefaultRole: pgconf.defaultRole,
    jwtPgTypeIdentifier: pgconf.jwtTokenIdentifier,
    jwtSecret: pgconf.jwtSecret,
    graphiql: true
}));

if (process.env.NODE_ENV && process.env.NODE_ENV == 'development') {
    const webpack = require('webpack');
    const webpackDevMiddleware = require('webpack-dev-middleware');
    const webpackConfig = require('../webpack.config.js');
    const compiler = webpack({ ...webpackConfig, mode: 'development' });
    app.use(webpackDevMiddleware(compiler));
}

app.use(express.static('dist'));

app.listen(process.env.PORT || 3000);

// function initializeServer() {
//     const app = express();

//     let post = postgraphile(connection, [pgconf.schema], {
//         pgDefaultRole: pgconf.defaultRole,
//         jwtPgTypeIdentifier: pgconf.jwtTokenIdentifier,
//         jwtSecret: pgconf.jwtSecret,
//         graphiql: true
//     });
//     console.log(post);
//     app.use(post);
    
//     if (process.env.NODE_ENV && process.env.NODE_ENV == 'development') {
//         const webpack = require('webpack');
//         const webpackDevMiddleware = require('webpack-dev-middleware');
//         const webpackConfig = require('../webpack.config.js');
//         const compiler = webpack({ ...webpackConfig, mode: 'development' });
//         app.use(webpackDevMiddleware(compiler));
//     }
    
//     app.use(express.static('dist'));
    
//     app.listen(process.env.PORT || 3000);
// }

// // // Wait until (or ensure) the database is up, then initialize the server
// // let testDBConnection = new pg.Client({ connectionString: connection });
// // let waitForDB = () => testDBConnection.connect().then(initializeServer).catch(waitForDB);
// // waitForDB();

// setTimeout(initializeServer, 5000);