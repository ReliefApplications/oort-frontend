import { Plugin } from 'chart.js';

/**
 * No data plugin
 * Displays a message on top of chart to indicate lack of data.
 */
const noDataPlugin: Plugin = {
  id: 'noData',
  /**
   * Before draw, check if there's no data to display a message.
   *
   * @param chart Current chart
   * @param args Chart arguments
   * @param options Plugin options
   */
  beforeDraw(chart, args, options) {
    if (!options || !options.display || options.loading) {
      return;
    }

    const { datasets } = chart.data;
    const hasData = datasets.some((ds) => ds.data && ds.data.length > 0);

    if (!hasData) {
      const {
        ctx,
        chartArea: { width, height },
      } = chart;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '16px sans-serif';
      ctx.fillStyle = 'gray';
      ctx.fillText(options.text || 'No data available', width / 2, height / 2);
      ctx.restore();
    }
  },
};

export default noDataPlugin;
