# Basemaps Config

LINZ specific configuration and delployment of [basemaps](https://github.com/linz/basemaps).

## Usage

This package initially is to control the imagery present in the LINZ basemaps product.

### Server

This configuration can be used with basemaps server @basemaps/server to create a working tile server

```
yarn add @basemaps/server

npx basemaps-server config
```

You will need access to basemaps imagery, if you need access to basemaps imagery please contact basemaps@linz.govt.nz 

### Imagery `/config/imagery`

All individual imagery layers these are stored in both WebMercator (3857) and [NZTM (2193)](https://github.com/linz/NZTM2000TileMatrixSet) in a LINZ s3 bucket as [cloud optimized geotiffs (COG)](https://www.cogeo.org/).

these config files reference the locations of all the tiffs and their bounding boxes that make up the dataset.

These imagery sets can be viewed in basemaps by using their id.

WebMercator: [wellington_urban_2021_0-075m_RGB](./config/imagery/wellington_urban_2021_0-075m_RGB-WebMercatorQuad.json) - https://basemaps.linz.govt.nz/?i=01FBNERWAX2XVCKQ4AACWGP2K5#@-41.2777800,174.7949622,z10.4323

NZTM - [wellington_urban_2021_0-075m_RGB](./config/imagery/wellington_urban_2021_0-075m_RGB-NZTM2000Quad.json) - https://basemaps.linz.govt.nz/?i=01F6P21F387PCQQB757VZ4E6GS&p=nztm2000quad#@-41.2777800,174.7949622,z10.4323


### Tileset `/config/tileset`

Specifies how the imagery is combined into a single layer

[config/tileset/aerial.json](./config/tileset/aerial.json) - https://basemaps.linz.govt.nz/?i=aerial
[config/tileset/topo.json](./config/tileset/topo.json) - https://basemaps.linz.govt.nz/?i=topo&p=nztm2000quad 



## Building

This repository requires [NodeJs](https://nodejs.org/en/) > 12 & [Yarn](https://yarnpkg.com/en/)

Use [n](https://github.com/tj/n) to manage nodeJs versions

```bash
# Download the latest nodejs & yarn
n latest
npm install -g yarn

# Install node deps
yarn

# Build everything into /build
yarn run build

# Run the unit tests
yarn run test
```



## Contributing

This repository uses [Conventional Commits](https://www.conventionalcommits.org/)

We have very precise rules over how our git commit messages can be formatted. This leads to more readable messages that are easy to follow when looking through the project history. But also, we use the git commit messages to generate the change log.

### Type

Must be one of the following:

- build: Changes that affect the build system or external dependencies
- ci: Changes to our CI configuration files and scripts
- docs: Documentation only changes
- feat: A new feature
- fix: A bug fix
- perf: A code change that improves performance
- refactor: A code change that neither fixes a bug nor adds a feature
- style: Changes that do not affect the meaning of the code
- test: Adding missing tests or correcting existing tests

### Scope

- `aerial` Changes the aerial tile set `./config/tileset/aerial.json`
- `imagery` Adding or removing imagery layers `./config/imagery/*`
- `vector` Changes to the vector layers `./config/style/*` or `./config/tileset/topographic.json`
- `scripts` Changes to the importing scripts `./src`