# Bill Manager

An experiment with writing a full stack app based off of a rich PostgreSQL schema along with an automatically generated GraphQL schema provided by [postgraphile](https://github.com/graphile/postgraphile).
The components are

* `server/initdb.sql` -- A script to populate and set up the application's PostgreSQL database. The database handles authentication by using JSON web tokens and [Row Level Security](https://www.postgresql.org/docs/9.5/static/ddl-rowsecurity.html). 
* `server/server.js` -- A 20-line "server" that serves the static web app and connects a postgraphile instance to the database.
* `src/**.*` -- A static web app using [Vue](https://vuejs.org/), [vue-apollo](https://github.com/Akryum/vue-apollo), and [Bulma](https://bulma.io/) that consumes the GraphQL API.
