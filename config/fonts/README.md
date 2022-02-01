# Fonts/Glyphs

New fonts and glyphs are not automatically imported due to the number of files generated.

## Building glyphs

[build_pbf_glyphs](https://github.com/stadiamaps/build_pbf_glyphs) is used to create [SDF](https://github.com/stadiamaps/sdf_glyph_renderer) protobuf font glyphs


Install the CLI using rust/cargo
```
cargo install build_pbf_glyphs
```

Build and import the fonts

```
./bin/import-fonts.js
```
