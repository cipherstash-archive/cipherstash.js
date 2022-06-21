# StashJS benchmarks

This repo contains code to benchmark CipherStash import speed via StashJS.

## Running the benchmarks

1. Clone this repo
2. Copy `.envrc.example` to `.envrc` and edit as needed
3. `npm install`
4. `npm run build`
5. `npm run collection:create`
6. `npm run bench`

The benchmark will authenticate using your default CipherStash profile. Make sure you understand whether you are benchmarking againsts production or you dev-local data-service instance.

