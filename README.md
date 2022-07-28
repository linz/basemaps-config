# Basemaps Config

LINZ specific configuration and deployment of [basemaps](https://github.com/linz/basemaps).

## Usage

This package initially is to control the imagery present in the LINZ basemaps product.

### Server

This configuration can be used with basemaps server @basemaps/server to create a working tile server

```
yarn add @basemaps/server

npx basemaps-server config
```

You will need access to basemaps imagery, if you need access to basemaps imagery please contact basemaps@linz.govt.nz 


### Tileset `/config/tileset`

Specifies how the imagery is combined into a single layer

[config/tileset/aerial.json](./config/tileset/aerial.json) - https://basemaps.linz.govt.nz/?i=aerial

Each layer inside the tile set is also created as a individual layer that can be viewed by name or by id

For example the layer "Auckland 0.075m Rural Aerial Photos (2020)" has one name and two ids

```
name: auckland-rural-2022-0.075m
3857/WebMercator: 01G4XPQKF6VB9SXCQ93R2XC1W8
2193/NZTM2000Quad: 01G4XPNP9JTGGPABCFRWC4N21E
```

which create the following urls

#### By Name
- [3857/WebMercator - auckland-rural-2022-0.075m](https://basemaps.linz.govt.nz/?i=auckland-rural-2022-0.075m)
- [2193/NZTM2000Quad - auckland-rural-2022-0.075m](https://basemaps.linz.govt.nz/?i=auckland-rural-2022-0.075m&p=nztm2000quad)

#### By Id
- [3857/WebMercator - 01G4XPQKF6VB9SXCQ93R2XC1W8](https://basemaps.linz.govt.nz/?i=01G4XPQKF6VB9SXCQ93R2XC1W8)
- [2193/NZTM2000Quad - 01G4XPNP9JTGGPABCFRWC4N21E](https://basemaps.linz.govt.nz/?i=01G4XPNP9JTGGPABCFRWC4N21E&p=nztm2000quad)



### Fonts `./config/fonts`

Fonts are built automatically using [linz/action-build-pbf-glyphs](https://github.com/linz/action-build-pbf-glyphs) and then deployed as a [Cotar](https://github.com/linz/cotar) asset bundle

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
- `vector` Changes to the vector layers `./config/style/*` or `./config/tileset/topographic.json`
- `sprites` Changes to the sprites `./config/sprites/**`
- `fonts` Changes to fonts  `./config/fonts/**`
