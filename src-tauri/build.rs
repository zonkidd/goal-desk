fn main() {
    #[cfg(target_os = "macos")]
    {
        cc::Build::new()
            .file("native/EventKitBridge.m")
            .flag("-fobjc-arc")
            .compile("goal_desk_eventkit_bridge");

        println!("cargo:rustc-link-lib=framework=Foundation");
        println!("cargo:rustc-link-lib=framework=EventKit");
        println!("cargo:rerun-if-changed=native/EventKitBridge.h");
        println!("cargo:rerun-if-changed=native/EventKitBridge.m");
    }

    tauri_build::build();
}
