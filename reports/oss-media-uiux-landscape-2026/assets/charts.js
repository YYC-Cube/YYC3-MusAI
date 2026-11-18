// 图表初始化（ECharts，SVG 渲染）
(function () {
  var style = getComputedStyle(document.documentElement);
  var accent = style.getPropertyValue('--accent').trim();
  var accent2 = style.getPropertyValue('--accent2').trim();
  var ink = style.getPropertyValue('--ink').trim();
  var muted = style.getPropertyValue('--muted').trim();
  var rule = style.getPropertyValue('--rule').trim();
  var bg2 = style.getPropertyValue('--bg2').trim();

  // --- 图 1：领域项目数量 ---
  var el1 = document.getElementById('chart-domain');
  if (el1) {
    var chart1 = echarts.init(el1, null, { renderer: 'svg' });
    chart1.setOption({
      animation: false,
      grid: { left: 90, right: 30, top: 20, bottom: 24 },
      tooltip: { trigger: 'axis', appendToBody: true },
      xAxis: {
        type: 'value',
        axisLabel: { color: muted },
        splitLine: { lineStyle: { color: rule } },
      },
      yAxis: {
        type: 'category',
        data: ['音乐服务/播放器', '社交', '媒体/视频', '综艺/内容制作', 'UI/UX 组件包'],
        axisLabel: { color: ink },
        axisLine: { lineStyle: { color: rule } },
      },
      series: [
        {
          type: 'bar',
          data: [8, 7, 10, 7, 20],
          barWidth: 18,
          itemStyle: {
            borderRadius: [0, 6, 6, 0],
            color: function (p) {
              return p.dataIndex === 4 ? accent2 : accent;
            },
          },
          label: { show: true, position: 'right', color: muted, formatter: '{c}' },
        },
      ],
    });
    window.addEventListener('resize', function () { chart1.resize(); });
  }

  // --- 图 2：Top 10 契合度 ---
  var el2 = document.getElementById('chart-fit');
  if (el2) {
    var chart2 = echarts.init(el2, null, { renderer: 'svg' });
    var dims = ['shadcn/ui', 'Radix Primitives', 'Motion', 'WaveSurfer.js', 'Video.js 10',
      'hls.js', 'TanStack Virtual', 'dnd-kit', 'Recharts', 'Navidrome', 'PeerTube'];
    var vals = [5, 5, 5, 5, 4.8, 4.7, 4.6, 4.5, 4.4, 4.2, 3.8];
    chart2.setOption({
      animation: false,
      grid: { left: 130, right: 40, top: 16, bottom: 24 },
      tooltip: { trigger: 'axis', appendToBody: true, valueFormatter: function (v) { return v + ' / 5'; } },
      xAxis: {
        type: 'value',
        min: 0,
        max: 5,
        axisLabel: { color: muted },
        splitLine: { lineStyle: { color: rule } },
      },
      yAxis: {
        type: 'category',
        data: dims.slice().reverse(),
        axisLabel: { color: ink },
        axisLine: { lineStyle: { color: rule } },
      },
      series: [
        {
          type: 'bar',
          data: vals.slice().reverse(),
          barWidth: 14,
          itemStyle: {
            borderRadius: [0, 6, 6, 0],
            color: function (p) {
              return p.dataIndex >= 9 ? accent2 : accent;
            },
          },
          label: { show: true, position: 'right', color: muted },
        },
      ],
    });
    window.addEventListener('resize', function () { chart2.resize(); });
  }
})();
