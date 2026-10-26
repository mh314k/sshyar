/// Last path segment (`/a/b/c` → `c`).
pub fn basename(path: &str) -> &str {
    path.rsplit('/').next().unwrap_or(path)
}

/// Join remote parent + name without doubling slashes.
pub fn join(parent: &str, name: &str) -> String {
    if parent.ends_with('/') {
        format!("{parent}{name}")
    } else {
        format!("{parent}/{name}")
    }
}

/// True when `dest` is `src` or nested under `src`.
pub fn is_self_or_descendant(src: &str, dest: &str) -> bool {
    dest == src || dest.starts_with(&format!("{src}/"))
}
