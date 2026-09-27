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
        // Windows import libs for the C engine's Win32 calls.
        // hid: HidD_*/HidP_*, setupapi: SetupDi*, cfgmgr32: CM_*,
        // shell32: ShellExecuteW, user32: SendInput.
        for lib in ["hid", "setupapi", "cfgmgr32", "shell32", "user32"] {
            println!("cargo:rustc-link-lib={lib}");
        }
    }
}
