import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import scrollama from "https://cdn.jsdelivr.net/npm/scrollama/+esm";
import { COLORS } from "./colors.js";

/* -------------------------
   CARGA Y PREPARACIÓN DATOS
-------------------------- */
async function loadData() {
  const raw = await d3.csv("data/global_conflict_dataset.csv", d => ({
    entity: d.Entity.trim(),
    code: d.Code,
    year: +d.Year,
    region: d.Region,
    deaths: +d.deaths_total_best_estimate || 0,
    deaths_civilians: +d.deaths_civilians || 0,
    deaths_combatants: +d.deaths_combatants || 0,
    deaths_unknown: +d.deaths_unknown || 0,
    armed_forces_total: +d.armed_forces_total || 0,
    military_expenditure_by_gdp: +d.military_expenditure_by_gdp || 0,
    territory_state_control_pct: +d.territory_state_control_pct || 0,
    political_regime: d.political_regime,
    public_admin_quality: +d.public_admin_quality || 0,
    state_conflict_deaths: +d.state_conflict_deaths || 0,
    onesided_conflict_deaths: +d.onesided_conflict_deaths || 0,
    nonstate_conflict_deaths: +d.nonstate_conflict_deaths || 0
  }));

  const countriesWithDeaths = new Set(
    raw.filter(d => d.deaths_total > 0).map(d => d.entity)
  );

  return { raw, countriesWithDeaths };
}

/* -------------------------
   CHARTS
-------------------------- */

// Grafico de barras persona 
export function drawBarChart(selector, dataset) {
  console.log("debug 0"); // debug
  const margin = { top: 0, right: 40, bottom: 40, left: 20 };
  const width = 950 - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  const svg = d3
    .select(selector)
    .append("svg")
    .attr("preserveAspectRatio", "xMidYMid meet");

  const AXIS_PADDING = 20;

  svg.attr(
    "viewBox",
    [
      -AXIS_PADDING,
      0,
      width + margin.left + margin.right + AXIS_PADDING,
      height + margin.top + margin.bottom
    ]
  );

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand()
    .range([0, width])
    .paddingInner(0.1)
    .paddingOuter(0);

  const y = d3.scaleLinear()
    .range([0, height]);

  const rollup = d3.rollup(
    dataset,
    v => d3.sum(v, d => d.deaths),
    d => d.year
  );

  const data = Array.from(rollup, ([year, deaths]) => ({ year, deaths }))
    .filter(d => d.deaths > 0)
    .sort((a, b) => d3.ascending(a.year, b.year));

  x.domain(data.map(d => d.year));
  y.domain([0, d3.max(data, d => d.deaths)]);

  const yAxis = g
  .append("g")
  .attr("class", "axis y-axis");

  yAxis.call(
    d3.axisLeft(y)
      .ticks(5)
      .tickFormat(d3.format(".2s"))
  );

  const bars = g
    .selectAll(".bar")
    .data(data)
    .join("rect")
    .attr("class", "bar")
    .attr("x", d => x(d.year))
    .attr("y", 0)             
    .attr("width", x.bandwidth())
    .attr("height", 0)        
    .style("fill", COLORS.red.strong);


  const labels = g
    .selectAll(".year-label")
    .data(data)
    .join("text")
    .attr("class", "year-label")
    .attr("x", d => x(d.year) + x.bandwidth() / 2)
    .attr("y", 0)
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "hanging")
    .style("font-size", "8px")
    .style("fill", COLORS.text.primary)
    .text(d => d.year);
  console.log("debug -1"); // debug

  svg.append("text")
    .attr("x", 10)      // píxeles desde la izquierda 
    .attr("y", 325)       // píxeles desde arriba 
    .attr("fill", COLORS.text.primary)
    .attr("font-size", "11px")
    .attr("font-weight", "normal")
    .call(text => {
      text.append("tspan")
          .text("Genocidio")
          .attr("x", 185)
          .attr("dy", 0);  
      text.append("tspan")
          .text("de Ruanda")
          .attr("x", 185)
          .attr("dy", "1.2em"); 
    });

  return () => {
    bars
      .transition()
      .duration(1000)
      .delay((_, i) => i * 20)
      .attr("height", d => y(d.deaths));

    labels
      .transition()
      .duration(1000)
      .delay((_, i) => i * 20)
      .attr("y", d => y(d.deaths) + 4); 
  };
  
}


// Grafico donut 
export function drawDonutChart(selector, dataset) {
  const width = 1200;
  const height = 1000;
  const radius = Math.min(width, height) / 2 - 50;

  const svg = d3
    .select(selector)
    .append("svg")
    .attr("viewBox", [-width / 2, -height / 2, width, height])
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("width", "100%")
    .style("height", "100%");

  const avg = {
    state: Math.max(d3.mean(dataset, d => d.state_conflict_deaths || 0), 1),
    onesided: Math.max(d3.mean(dataset, d => d.onesided_conflict_deaths || 0), 1),
    nonstate: Math.max(d3.mean(dataset, d => d.nonstate_conflict_deaths || 0), 1)
  };

  const data = [
    { label: "Estatales", value: avg.state, color: COLORS.green.strong },
    { label: "Unidireccionales", value: avg.onesided, color: COLORS.red.strong },
    { label: "No estatales", value: avg.nonstate, color: COLORS.green.bright }
  ];

  const pie = d3.pie().sort(null).value(d => d.value);
  const arc = d3.arc().innerRadius(radius * 0.6).outerRadius(radius * 0.9);
  const outerArc = d3.arc().innerRadius(radius).outerRadius(radius);

  const arcs = pie(data);
  const total = d3.sum(data, d => d.value);

  const paths = svg.selectAll("path")
    .data(arcs)
    .join("path")
    .attr("fill", d => d.data.color)
    .attr("stroke", COLORS.background)
    .attr("stroke-width", 2)
    .each(function () {
      this._current = { startAngle: 0, endAngle: 0 };
    })
    .attr("d", arc);

  const centerText = svg.append("text")
    .attr("text-anchor", "middle")
    .attr("dy", "0.35em")
    .style("font-size", "14px")
    .style("fill", COLORS.text.secondary)
    .style("opacity", 0);

  centerText.append("tspan")
    .attr("x", 0)
    .text("Víctimas por");

  centerText.append("tspan")
    .attr("x", 0)
    .attr("dy", "1.2em")
    .text("tipo de conflicto");

  const polylines = svg.selectAll("polyline")
    .data(arcs)
    .join("polyline")
    .attr("stroke", COLORS.text.primary)
    .attr("stroke-width", 1)
    .attr("fill", "none")
    .attr("opacity", 0)
    .attr("points", d => {
      const pos = outerArc.centroid(d);
      const mid = (d.startAngle + d.endAngle) / 2;
      const x = radius * 1.2 * (mid < Math.PI ? 1 : -1);
      return [arc.centroid(d), outerArc.centroid(d), [x, pos[1]]];
    });

  const labels = svg.selectAll("text.label")
    .data(arcs)
    .join("text")
    .attr("class", "label")
    .attr("opacity", 0)
    .attr("transform", d => {
      const mid = (d.startAngle + d.endAngle) / 2;
      const x = radius * 1.25 * (mid < Math.PI ? 1 : -1);
      const y = outerArc.centroid(d)[1];
      return `translate(${x},${y})`;
    })
    .attr("text-anchor", d =>
      (d.startAngle + d.endAngle) / 2 < Math.PI ? "start" : "end"
    )
    .style("font-size", "12px")
    .style("fill", COLORS.text.primary)
    .each(function (d) {
      const percent = ((d.data.value / total) * 100).toFixed(0);
      const t = d3.select(this);
      t.append("tspan")
        .text(d.data.label + " ")
        .attr("font-weight", "bold");
      t.append("tspan")
        .text(`${percent}%`)
        .attr("fill", COLORS.text.secondary)
        .attr("dx", "2");
    });

  // animación x step
  return () => {
    paths
      .transition()
      .duration(1000)
      .ease(d3.easeCubicOut)
      .attrTween("d", function (d) {
        const i = d3.interpolate(this._current, d);
        this._current = i(1);
        return t => arc(i(t));
      });

    centerText
      .transition()
      .delay(600)
      .duration(400)
      .style("opacity", 1);

    polylines
      .transition()
      .delay(800)
      .duration(400)
      .attr("opacity", 1);

    labels
      .transition()
      .delay(1000)
      .duration(400)
      .attr("opacity", 1);
  };
}


// dispersión
export function drawDeathsVsTerritory(selector, dataset) {
  const width = 700;
  const height = 400;
  const margin = { top: 40, right: 40, bottom: 60, left: 80 };

  const data = dataset.filter(d =>
    d.deaths > 0 &&
    d.territory_state_control_pct >= 0
  );

  const svg = d3.select(selector)
    .append("svg")
    .attr("viewBox", [0, 0, width, height]);

  const x = d3.scaleLinear()
    .domain([0, 100])
    .range([margin.left, width - margin.right]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.deaths)])
    .nice()
    .range([height - margin.bottom, margin.top]);

  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x));

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).tickFormat(d3.format(".2s")));

  svg.selectAll("circle")
    .data(data)
    .join("circle")
    .attr("cx", d => x(d.territory_state_control_pct))
    .attr("cy", d => y(d.deaths))
    .attr("r", 3)
    .attr("fill", COLORS.red.bright)
    .attr("opacity", 0.6);
}


//barras
export function drawDeathsVsRegime(selector, dataset) {
  const width = 900;
  const height = 550;
  const margin = { top: 40, right: 20, bottom: 40, left: 80 };

  const cleanData = dataset.filter(d =>
    d.deaths > 0 &&
    d.political_regime != null &&
    !isNaN(d.year)
  );

  const years = Array.from(new Set(cleanData.map(d => d.year))).sort(d3.ascending);
  const regimes = Array.from(new Set(cleanData.map(d => d.political_regime)));

  const grouped = d3.rollups(
    cleanData,
    v => d3.sum(v, d => d.deaths),
    d => d.year,
    d => d.political_regime
  );

  const data = grouped.map(([year, values]) => {
    const row = { year };
    regimes.forEach(regime => {
      const found = values.find(v => v[0] === regime);
      row[regime] = found ? found[1] : 0;
    });
    return row;
  });

  const stack = d3.stack().keys(regimes);
  const stackedData = stack(data);

  const svg = d3.select(selector)
    .append("svg")
    .attr("viewBox", [0, 0, width, height]);

  const x = d3.scaleBand()
    .domain(years)
    .range([margin.left, width - margin.right])
    .padding(0.1);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d3.sum(regimes, r => d[r]))])
    .nice()
    .range([height - margin.bottom, margin.top]);

  const color = d3.scaleOrdinal()
    .domain(regimes)
    .range([COLORS.red.strong, COLORS.text.secondary, COLORS.red.bright, COLORS.green.bright, COLORS.green.strong]);

  const xAxis = svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).tickValues(years.filter(y => y % 5 === 0)));

  xAxis.selectAll("path, line").attr("stroke", COLORS.text.secondary);
  xAxis.selectAll("text").attr("fill", COLORS.text.secondary)
       .attr("transform", "rotate(-45)").style("text-anchor", "end");

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).tickFormat(d3.format(".2s")))
    .call(g => {
      g.selectAll("path, line").attr("stroke", COLORS.text.secondary);
      g.selectAll("text").attr("fill", COLORS.text.secondary);
    });

  // Texto adicional
  svg.append("text")
    .attr("x", 30)
    .attr("y", 75)
    .attr("fill", COLORS.text.primary)
    .attr("font-size", "11px")
    .attr("font-weight", "normal")
    .call(text => {
      text.append("tspan").text("Invasión de").attr("x", 740).attr("dy", 0);
      text.append("tspan").text("Ucrania").attr("x", 740).attr("dy", "1.2em");
    });

  const layers = svg.selectAll("g.layer")
    .data(stackedData)
    .join("g")
    .attr("class", "layer")
    .attr("fill", d => color(d.key));

  const rects = layers.selectAll("rect")
    .data(d => d)
    .join("rect")
    .attr("x", d => x(d.data.year))
    .attr("y", y(0))        // inicio desde 0
    .attr("height", 0)      // altura inicial 0
    .attr("width", x.bandwidth());

  // animación
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        rects.transition()
          .duration(1000)
          .attr("y", d => y(d[1]))
          .attr("height", d => y(d[0]) - y(d[1]));
        observer.disconnect(); 
      }
    });
  }, { threshold: 0.5 });

  observer.observe(svg.node());
}


// líneas gasto militar
export function drawMilitarySpendingByRegion(selector, dataset) {
  const width = 900;
  const height = 500;
  const margin = { top: 40, right: 140, bottom: 60, left: 80 };

  const cleanData = dataset.filter(d =>
    d.region &&
    !isNaN(d.year) &&
    d.military_expenditure_by_gdp > 0
  );

  const grouped = d3.rollups(
    cleanData,
    v => d3.mean(v, d => d.military_expenditure_by_gdp),
    d => d.region,
    d => d.year
  );

  const dataByRegion = grouped.map(([region, values]) => ({
    region,
    values: values
      .map(([year, value]) => ({ year: +year, value }))
      .sort((a, b) => d3.ascending(a.year, b.year))
  }));

  const regions = dataByRegion.map(d => d.region);

  const x = d3.scaleLinear()
    .domain(d3.extent(dataByRegion.flatMap(d => d.values), d => d.year))
    .range([margin.left, width - margin.right]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(dataByRegion.flatMap(d => d.values), d => d.value)])
    .nice()
    .range([height - margin.bottom, margin.top]);

  const color = d3.scaleOrdinal()
    .domain(regions)
    .range([
      COLORS.green.strong,
      COLORS.red.strong,
      "#617B38",
      "#CC1900",
      COLORS.green.bright,
      COLORS.red.bright
    ]);

  const svg = d3.select(selector)
    .append("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("preserveAspectRatio", "xMidYMid meet");

  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")))
    .selectAll("text")
    .attr("fill", "#ffffff");

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).tickFormat(d => d + "%"))
    .selectAll("text")
    .attr("fill", "#ffffff");

  const line = d3.line()
    .defined(d => d.value != null)
    .x(d => x(d.year))
    .y(d => y(d.value));

  const paths = svg.selectAll(".region-line")
    .data(dataByRegion)
    .join("path")
    .attr("class", "region-line")
    .attr("fill", "none")
    .attr("stroke", d => color(d.region))
    .attr("stroke-width", 2)
    .attr("d", d => line(d.values))
    .attr("stroke-dasharray", function() { return this.getTotalLength(); })
    .attr("stroke-dashoffset", function() { return this.getTotalLength(); });

  const legend = svg.append("g")
    .attr("transform", `translate(${width - margin.right + 20}, ${margin.top})`);

  const legendItem = legend.selectAll(".legend-item")
    .data(regions)
    .join("g")
    .attr("class", "legend-item")
    .attr("transform", (d, i) => `translate(0, ${i * 20})`);

  legendItem.append("line")
    .attr("x1", 0)
    .attr("x2", 20)
    .attr("y1", 0)
    .attr("y2", 0)
    .attr("stroke", d => color(d))
    .attr("stroke-width", 3);

  legendItem.append("text")
    .attr("x", 26)
    .attr("y", 4)
    .style("font-size", "12px")
    .style("fill", "#ffffff")
    .text(d => d);

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        paths.transition()
          .duration(1500)
          .attr("stroke-dashoffset", 0);
        observer.disconnect(); // animar solo una vez
      }
    });
  }, { threshold: 0.5 });

  observer.observe(svg.node());
}



// barras apiladas
export function drawStackedBarChart(selector, dataset) {
  const width = 750;
  const height = 420;
  const margin = { top: 40, right: 40, bottom: 40, left: 160 };

  const conflictTypes = ["state_conflict_deaths", "nonstate_conflict_deaths", "onesided_conflict_deaths"];

  const CONFLICT_CONFIG = {
    state_conflict_deaths: { label: "Estatales", color: COLORS.green.strong },
    nonstate_conflict_deaths: { label: "No estatales", color: COLORS.red.strong },
    onesided_conflict_deaths: { label: "Unidireccionales", color: COLORS.green.bright }
  };

  const TERRITORY_BINS = [
    { key: "30%-40%", min: 30, max: 40 },
    { key: "40%-50%", min: 40, max: 50 },
    { key: "50%-60%", min: 50, max: 60 },
    { key: "60%-70%", min: 60, max: 70 },
    { key: "70%-80%", min: 70, max: 80 },
    { key: "80%-90%", min: 80, max: 90 },
    { key: "90%-100%", min: 90, max: 100 }
  ];
  const aggregated = TERRITORY_BINS.map(bin => {
    const rows = dataset.filter(d =>
      d.territory_state_control_pct >= bin.min &&
      d.territory_state_control_pct < bin.max
    );

    let totalPerType = {};
    let totalAll = 0;

    conflictTypes.forEach(type => {
      const sum = d3.sum(rows, d => d[type] || 0);
      totalPerType[type] = sum;
      totalAll += sum;
    });

    conflictTypes.forEach(type => {
      totalPerType[type] = totalAll ? (totalPerType[type] / totalAll) * 100 : 0;
    });

    return { territory: bin.key, ...totalPerType };
  });

  const stack = d3.stack().keys(conflictTypes);
  const stackedData = stack(aggregated);

  const svg = d3.select(selector)
    .append("svg")
    .attr("viewBox", [0, 0, width, height]);

  const y = d3.scaleBand()
    .domain(TERRITORY_BINS.map(d => d.key))
    .range([margin.top, height - margin.bottom])
    .padding(0.3);

  const x = d3.scaleLinear()
    .domain([0, 100]) 
    .range([margin.left, width - margin.right]);

  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).tickFormat(d => d + "%"))
    .call(g => {
      g.selectAll("path, line").attr("stroke", COLORS.text.secondary);
      g.selectAll("text").attr("fill", COLORS.text.secondary);
    });

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y))
    .call(g => {
      g.selectAll("path, line").attr("stroke", COLORS.text.secondary);
      g.selectAll("text").attr("fill", COLORS.text.secondary);
    });

  svg.selectAll(".layer")
    .data(stackedData)
    .join("g")
    .attr("class", "layer")
    .attr("fill", d => CONFLICT_CONFIG[d.key].color)
    .selectAll("rect")
    .data(d => d)
    .join("rect")
    .attr("y", d => y(d.data.territory))
    .attr("x", d => x(d[0]))
    .attr("height", y.bandwidth())
    .attr("width", d => x(d[1]) - x(d[0]));

  const legend = svg.append("g")
    .attr("transform", `translate(${width / 2}, 20)`);

  const legendItem = legend.selectAll(".legend-item")
    .data(conflictTypes)
    .join("g")
    .attr("class", "legend-item")
    .attr("transform", (d, i) =>
      `translate(${(i - 1) * 160}, 0)`
    );

  legendItem.append("rect")
    .attr("width", 14)
    .attr("height", 14)
    .attr("x", -7)
    .attr("y", -7)
    .attr("fill", d => CONFLICT_CONFIG[d].color);

  legendItem.append("text")
    .attr("x", 12)
    .attr("y", 4)
    .style("font-size", "12px")
    .style("fill", COLORS.text.primary)
    .text(d => CONFLICT_CONFIG[d].label);
}



/* -------------------------
   SCROLL
-------------------------- */
let barAnimateFn = null; 
let donutAnimateFn90 = null; 
let donutAnimateFn10 = null; 
let scatterFn = null; 
let regimeFn = null;
let expenditureFn = null;
let stackedBarFn = null;

function initScrolly() {
  const scroller = scrollama();

  scroller
    .setup({ step: ".step", offset: 0.6 })
    .onStepEnter(({ index, element }) => {
      if (index === 0) {
        barAnimateFn();
      }
      if (index === 1) {
        donutAnimateFn90();
        donutAnimateFn10();
      }
      //scatterFn;
      if (index === 3) {
        regimeFn;
      }
      if (index === 4) {
        expenditureFn;
      }
      
    });
}



/* -------------------------
   INIT
-------------------------- */
async function init() {
  const og_data = await loadData();
  const data = og_data.raw.filter(d =>
    !(d.code === "RWA" && d.year >= 1994)
  );

  barAnimateFn = drawBarChart("#bar-chart", og_data.raw);

  const rowsWithDeaths = data.filter(
    d => d.deaths_civilians + d.deaths_combatants + d.deaths_unknown > 0
  );
  const filteredData90 = data.filter(d =>
    d.year >= 1990 && d.year <= 2000
  );
  const filteredData10 = data.filter(d =>
    d.year >= 2010 && d.year <= 2020
  );

  donutAnimateFn90 = drawDonutChart("#donut-chart-90", filteredData90);
  donutAnimateFn10 = drawDonutChart("#donut-chart-10", filteredData10);
  scatterFn = drawDeathsVsTerritory("#scatter-plot", data);
  regimeFn = drawDeathsVsRegime("#regime-bar-chart", data);
  expenditureFn = drawMilitarySpendingByRegion("#military-spending-chart", data);
  stackedBarFn = drawStackedBarChart("#stacked-bar-chart", data);

  initScrolly();
}

init();
