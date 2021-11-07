# StashJS

StashJS is a Typescript/Javascript API for the [CipherStash](https://cipherstash.com) always-encrypted searchable datastore.

Full documentation is available at [docs.cipherstash.com](https://docs.cipherstash.com).

## Authentication for local development

1. In `data-service` run `./build.sh setup` - this will ensure you have a local `mkcert` cert and a `dev-local` alias in your `/etc/hosts`
1. In the `stash-cli` directory run `pnpm build`

1. Ensure you run `direnv allow` after changing your `.envrc`
1. In `stash-cli` run `./bin/stash login`
1. Login should have been successful and your credentials should have been stored in `$HOME/.cipherstash/`
1. In `stashjs-examples` (or in whichever project you are planning on initialising the StashJS client), edit your `.envrc` to look like this:

```
export CS_AUTH_STRATEGY=stored-access-token
export CS_SERVICE_FQDN=dev-local:50001
export CS_IDP_HOST=cipherstash-dev.au.auth0.com
export CS_IDP_CLIENT_ID=tz5daCHFQLJRshlk9xr2Tl1G2nVJP5nv
export NODE_EXTRA_CA_CERTS="$(mkcert -CAROOT)/rootCA.pem"
export AWS_DEFAULT_REGION=ap-southeast-2

# Ask another CipherStash engineer for the following values:
export CS_FEDERATED_IDENTITY_ID=
export CS_DEV_CMK=
```

1. Running a command in `stashjs-examples` (such as `dist/create-collection.js`) should authenticate correctly.
