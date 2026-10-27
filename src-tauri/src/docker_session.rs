//! Compatibility shim — use [`crate::remote_exec`] for new code.
#![allow(unused_imports)]
pub use crate::remote_exec::{
    RemoteExecManager as DockerSessionManager, RemoteJobChunkEvent as DockerJobChunkEvent,
    SharedRemoteExec as SharedDockerSessions,
};
