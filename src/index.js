import './styles/theme.scss';

import ApolloClient from 'apollo-boost';
import Vue from 'vue';
import VueApollo from 'vue-apollo';
import gql from 'graphql-tag';

import App from './components/App.vue';

Vue.use(VueApollo);

const apolloClient = new ApolloClient({
    uri: '/graphql',
    request: operation => {
        let token = localStorage.getItem('token');
        if (token != null) {
            operation.setContext({
                headers: {
                    authorization: `Bearer ${token}`
                }
            });
        }
    }
});

const apolloProvider = new VueApollo({
    defaultClient: apolloClient,
});

new Vue({
    el: '#app',
    provide: apolloProvider.provide(),
    render: h => h(App),
});