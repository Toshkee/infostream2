// Drops ONE deprecation warning the app cannot act on; everything else is passed
// through untouched.
//
// @react-three/fiber constructs `new THREE.Clock()` internally — it's R3F's public
// `state.clock` API that our scenes read. three r183 deprecated `Clock` in favor of
// `Timer`, so the warning originates in R3F, not our code. The latest R3F (9.6.1,
// what we're on) still uses `Clock`, so there's no version to upgrade to and no
// app-level switch to `Timer`. Until R3F migrates upstream, silence just this line.
//
// This module is a singleton (evaluated once however many scenes import it), so the
// wrap happens a single time. Importing it before a <Canvas> mounts installs the
// filter ahead of the Clock construction.
if (typeof window !== "undefined") {
  const original = console.warn.bind(console);
  console.warn = (...args: unknown[]) => {
    const first = args[0];
    if (typeof first === "string" && first.includes("Clock: This module has been deprecated")) {
      return;
    }
    original(...args);
  };
}
