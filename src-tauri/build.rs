fn main() {
    tauri_build::build();

    #[cfg(target_os = "windows")]
    {
        let mut build = cc::Build::new();
        build
            .include("csrc/libstadia/include")
            .define("UNICODE", "1")
            .define("_UNICODE", "1")
            .file("csrc/libstadia/src/hid.c")
            .file("csrc/libstadia/src/stadia.c")
            .file("csrc/libstadia/src/utils.c")
            .file("csrc/libstadia/src/engine.c")
            .compile("stadia");
        println!("cargo:rerun-if-changed=csrc/libstadia");
    }
}
