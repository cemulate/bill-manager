const request = require('request-promise-native');
const config = require('config');

module.exports = function RecaptchaPlugin(builder) {
    builder.hook('GraphQLInputObjectType:fields', (fields, build, context) => {
        let pluginApplies = context.scope.isMutationInput && context.GraphQLInputObjectType.name == 'RegisterUserInput';
        if (!pluginApplies) return fields;

        const { GraphQLNonNull, GraphQLString } = build.graphql;
        return build.extend(fields, {
            recaptchaResponse: context.fieldWithHooks('recaptchaResponse', () => ({ type: new GraphQLNonNull(GraphQLString) })),
        });
    });

    builder.hook("GraphQLObjectType:fields:field", (field, build, context) => {
        let pluginApplies = context.scope.isRootMutation && context.scope.fieldName == 'registerUser';
        if (!pluginApplies) return field;

        let coreResolve = field.resolve;

        return {
            ...field,
            // Replace 'registerUser' resolver
            async resolve(...resolveParams) {
                let [ _, { input }, context ] = resolveParams;

                let validate = await request.post({
                    url: 'https://www.google.com/recaptcha/api/siteverify',
                    form: {
                        secret: config.recaptcha.secret,
                        response: input.recaptchaResponse,
                        ...(context.clientIp != null ? { clientIp: context.clientIp } : {})
                    },
                })
                .then(result => JSON.parse(result));

                if (validate.success) {
                    let coreResult = await coreResolve(...resolveParams);
                    return coreResult;
                } else {
                    throw new Error('Recaptcha validation failed');
                }
            }
        }
    });
}
