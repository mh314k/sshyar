use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "PascalCase")]
pub enum AuthMethod {
    Password,
    Key,
}

impl Default for AuthMethod {
    fn default() -> Self {
        Self::Password
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Profile {
    pub id: String,
    pub name: String,
    pub host: String,
    pub port: u16,
    pub username: String,
    pub auth_method: AuthMethod,
    #[serde(default)]
    pub password: Option<String>,
    #[serde(default)]
    pub private_key_path: Option<String>,
    #[serde(default)]
    pub group: String,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub post_connect_command: String,
    #[serde(default = "default_keepalive")]
    pub keepalive_interval: u32,
    #[serde(default = "default_keepalive_count")]
    pub keepalive_count_max: u32,
    #[serde(default)]
    pub notes: String,
}

fn default_keepalive() -> u32 {
    30
}
fn default_keepalive_count() -> u32 {
    3
}

impl Profile {
    pub fn new(name: String, host: String, username: String) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            name,
            host,
            port: 22,
            username,
            auth_method: AuthMethod::Password,
            password: None,
            private_key_path: None,
            group: "Default".into(),
            tags: vec![],
            post_connect_command: String::new(),
            keepalive_interval: 30,
            keepalive_count_max: 3,
            notes: String::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Snippet {
    pub id: String,
    pub name: String,
    pub command: String,
    #[serde(default)]
    pub profile_id: Option<String>,
}

impl Snippet {
    pub fn new(name: String, command: String) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            name,
            command,
            profile_id: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfileInput {
    pub name: String,
    pub host: String,
    pub port: u16,
    pub username: String,
    pub auth_method: AuthMethod,
    pub password: Option<String>,
    pub private_key_path: Option<String>,
    pub group: String,
    pub tags: Vec<String>,
    pub post_connect_command: String,
    pub keepalive_interval: u32,
    pub keepalive_count_max: u32,
    pub notes: String,
}
