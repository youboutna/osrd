use super::ApplicableDirectionsTrackRange;
use super::OSRDIdentified;

use super::utils::Identifier;
use super::utils::NonBlankString;
use super::OSRDTyped;
use super::ObjectType;
use super::Panel;

use crate::infra_cache::Cache;
use crate::infra_cache::ObjectCache;

use derivative::Derivative;

use editoast_derive::InfraModel;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Derivative, Clone, Deserialize, Serialize, PartialEq, InfraModel)]
#[serde(deny_unknown_fields)]
#[infra_model(table = "crate::tables::osrd_infra_speedsectionmodel")]
#[derivative(Default)]
pub struct SpeedSection {
    pub id: Identifier,
    #[derivative(Default(value = "Some(80.)"))]
    pub speed_limit: Option<f64>,
    pub speed_limit_by_tag: HashMap<NonBlankString, f64>,
    pub track_ranges: Vec<ApplicableDirectionsTrackRange>,
    #[serde(default)]
    pub extensions: SpeedSectionExtensions,
}

#[derive(Debug, Default, Clone, Deserialize, Serialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct SpeedSectionExtensions {
    pub lpv_sncf: Option<SpeedSectionLpvSncfExtension>,
}

#[derive(Debug, Default, Clone, Deserialize, Serialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct SpeedSectionLpvSncfExtension {
    announcement: Vec<Panel>,
    z: Panel,
    r: Vec<Panel>,
}

impl OSRDTyped for SpeedSection {
    fn get_type() -> ObjectType {
        ObjectType::SpeedSection
    }
}

impl OSRDIdentified for SpeedSection {
    fn get_id(&self) -> &String {
        &self.id
    }
}

impl Cache for SpeedSection {
    fn get_track_referenced_id(&self) -> Vec<&String> {
        let mut res: Vec<_> = self.track_ranges.iter().map(|tr| &*tr.track).collect();
        if let Some(lpv) = &self.extensions.lpv_sncf {
            res.extend(lpv.announcement.iter().map(|panel| &*panel.track));
            res.extend(lpv.r.iter().map(|panel| &*panel.track));
            res.push(&*lpv.z.track);
        }
        res
    }

    fn get_object_cache(&self) -> ObjectCache {
        ObjectCache::SpeedSection(self.clone())
    }
}

#[cfg(test)]
mod test {
    use super::SpeedSection;
    use super::SpeedSectionExtensions;
    use crate::infra::tests::test_infra_transaction;
    use serde_json::from_str;

    #[test]
    fn test_speed_section_extensions_deserialization() {
        from_str::<SpeedSectionExtensions>(r#"{}"#).unwrap();
    }

    #[test]
    fn test_persist() {
        test_infra_transaction(|conn, infra| {
            let data = (0..10)
                .map(|_| SpeedSection::default())
                .collect::<Vec<SpeedSection>>();

            assert!(SpeedSection::persist_batch(&data, infra.id, conn).is_ok());
        });
    }
}
