import drawTrain from 'applications/operationalStudies/components/SimulationResults/SpaceTimeChart/drawTrain';
import createChart from 'applications/operationalStudies/components/SimulationResults/SpaceTimeChart/createChart';

function drawOPs(chartLocal, selectedTrainSimulation, rotate) {
  const operationalPointsZone = chartLocal.drawZone
    .append('g')
    .attr('id', 'get-operationalPointsZone');
  selectedTrainSimulation.base.stops.forEach((stop) => {
    operationalPointsZone
      .append('line')
      .datum(stop.position)
      .attr('id', `op-${stop.id}`)
      .attr('class', 'op-line')
      .attr('x1', rotate ? (d) => chartLocal.x(d) : 0)
      .attr('y1', rotate ? 0 : (d) => chartLocal.y(d))
      .attr('x2', rotate ? (d) => chartLocal.x(d) : chartLocal.width)
      .attr('y2', rotate ? chartLocal.height : (d) => chartLocal.y(d));
    operationalPointsZone
      .append('text')
      .datum(stop.position)
      .attr('class', 'op-text')
      .text(`${stop.name || 'Unknown'} ${Math.round(stop.position) / 1000}`)
      .attr('x', rotate ? (d) => chartLocal.x(d) : 0)
      .attr('y', rotate ? 0 : (d) => chartLocal.y(d))
      .attr('text-anchor', 'center')
      .attr('dx', 5)
      .attr('dy', rotate ? 15 : -5);
  });
}

const drawAxisTitle = (chart, rotate) => {
  chart.drawZone
    .append('text')
    .attr('class', 'axis-unit')
    .attr('text-anchor', 'end')
    .attr('transform', rotate ? 'rotate(0)' : 'rotate(-90)')
    .attr('x', rotate ? chart.width - 10 : -10)
    .attr('y', rotate ? chart.height - 10 : 20)
    .text('KM');
};

// eslint-disable-next-line default-param-last
const drawAllTrains = (
  allowancesSettings,
  chart,
  CHART_ID,
  dispatchUpdateChart,
  dispatchUpdateDepartureArrivalTimes,
  dispatchUpdateMustRedraw,
  dispatchUpdateSelectedTrain,
  heightOfSpaceTimeChart,
  keyValues,
  ref,
  reset,
  rotate,
  selectedProjection,
  selectedTrain,
  setChart,
  setDragOffset,
  setSelectedTrain,
  simulationTrains,
  simulationIsPlaying,
  trainsToDraw
) => {
  const chartLocal = createChart(
    chart,
    CHART_ID,
    trainsToDraw,
    heightOfSpaceTimeChart,
    keyValues,
    ref,
    reset,
    rotate
  );

  drawOPs(chartLocal, simulationTrains[selectedTrain], rotate);

  drawAxisTitle(chartLocal, rotate);
  trainsToDraw.forEach((train, idx) => {
    drawTrain(
      allowancesSettings,
      chartLocal,
      dispatchUpdateDepartureArrivalTimes,
      dispatchUpdateMustRedraw,
      dispatchUpdateSelectedTrain,
      train.id === selectedProjection?.id,
      idx === selectedTrain,
      keyValues,
      rotate,
      setDragOffset,
      setSelectedTrain,
      simulationTrains,
      train
    );
  });
  setChart(chartLocal);
  dispatchUpdateChart({ ...chartLocal, rotate });
  dispatchUpdateMustRedraw(false);
};

export { drawOPs, drawAllTrains };
