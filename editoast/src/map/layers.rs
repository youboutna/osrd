use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use serde_yaml::{self};

// select C.stuff from A inner join B C on C.id = C.id;
//                       \___________________________/
//                             a join expression
//                            C is an alias for B
type JoinExpr = String;

/// Layer view description
#[derive(Clone, Serialize, Deserialize, PartialEq, Debug)]
pub struct View {
    pub on_field: String,
    pub data_expr: String,
    #[serde(default)]
    pub exclude_fields: Vec<String>,
    #[serde(default)]
    pub joins: Vec<JoinExpr>,
    pub cache_duration: u32,
    #[serde(rename = "where", default)]
    pub where_expr: Vec<String>,
}

/// Layer description
#[derive(Clone, Serialize, Deserialize, PartialEq, Debug)]
pub struct Layer {
    pub table_name: String,
    pub views: HashMap<String, View>,
    #[serde(default)]
    pub id_field: Option<String>,
    #[serde(default)]
    pub attribution: Option<String>,
}

#[derive(Serialize, Deserialize, PartialEq, Debug)]
pub struct MapLayers {
    pub layers: HashMap<String, Layer>,
}

impl MapLayers {
    /// Parses file containing layers' description into MapLayers struct
    pub fn parse() -> MapLayers {
        serde_yaml::from_str(include_str!("../../map_layers.yml")).unwrap()
    }
}
