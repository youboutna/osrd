export const LIST_VALUES_NAME_SPACE_TIME = [
  'headPosition',
  'tailPosition',
  'speed',
  'margins_speed',
  'eco_speed',
  'margins_headPosition',
  'eco_headPosition',
  'eco_tailPosition',
] as const;
export const LIST_VALUES_NAME_SPEED_SPACE = ['speed', 'margins_speed', 'eco_speed'];
export const LIST_VALUES_NAME_SPACE_CURVES_SLOPES = ['slopesCurve'];
export const KEY_VALUES_FOR_CONSOLIDATED_SIMULATION = ['time', 'position'];

// CHARTS
export const TIME = 'time';
export const POSITION = 'position';
export const SPEED = 'speed';
export const KEY_VALUES_FOR_SPACE_TIME_CHART = [TIME, POSITION];
export const SPEED_SPACE_CHART_KEY_VALUES = [POSITION, SPEED];

// Signal Base is the Signaling system chosen for results display

export const SIGNAL_BASE_DEFAULT = 'BAL3';

export const LIST_VALUES_SIGNAL_BASE = ['BAL3'];

export const timetableURI = '/editoast/timetable/';
export const trainscheduleURI = '/train_schedule/';
export const scheduleURL = '/train_schedule/standalone_simulation/';
