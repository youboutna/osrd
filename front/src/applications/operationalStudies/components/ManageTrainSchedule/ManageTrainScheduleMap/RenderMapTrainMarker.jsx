import React from 'react';
import PropTypes from 'prop-types';
import MapTrainMarker from 'applications/operationalStudies/components/ManageTrainSchedule/ManageTrainScheduleMap/MapTrainMarker';
import { useSelector } from 'react-redux';
import { getConf } from 'reducers/osrdconf/selectors';

export default function RenderMapTrainMarker(props) {
  const osrdconf = useSelector(getConf);
  const { mapRef, mapTrainMarker } = props;
  if (
    osrdconf.trainCompo !== undefined &&
    osrdconf.trainCompo.imagesCompo !== undefined &&
    mapRef.current !== null
  ) {
    const map = mapRef.current.getMap();
    map.loadImage(osrdconf.trainCompo.imagesCompo[0], (error, image) => {
      if (error) throw error;
      if (!map.hasImage(osrdconf.trainCompo.codenbengin)) {
        map.addImage(osrdconf.trainCompo.codenbengin, image, { sdf: false });
      }
    });
  }
  if (mapTrainMarker !== undefined) {
    return <MapTrainMarker {...mapTrainMarker} />;
  }
  return '';
}

RenderMapTrainMarker.propTypes = {
  mapTrainMarker: PropTypes.object,
  mapRef: PropTypes.object.isRequired,
};

RenderMapTrainMarker.defaultProps = {
  mapTrainMarker: undefined,
};
