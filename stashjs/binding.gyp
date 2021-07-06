{
  "targets": [
    {
      "target_name": "napi_ore",
      "sources": [
        "./src/crypto/ore/ore.c",
        "./src/crypto/ore/fastore/ore_blk.c",
        "./src/crypto/ore/fastore/crypto.c",
      ],
      "xcode_settings": {
        "OTHER_CFLAGS": [
          "-maes",
          "-g",
          "-march=native",
          "-O3",
        ],
      },
      "cflags": [
        "-maes",
        "-g",
        "-march=native",
        "-O3",
        "-D PLATFORM_LINUX_X86"
      ],
      "libraries": ["-lgmp"],
      "include_dirs": [
        "./src/crypto/ore/fastore",
      ]
    }
  ]
}
