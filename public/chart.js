
// Define dimensions of graph using window size/time
const margins = [
  0.1 * window.innerHeight,
  0.1 * window.innerHeight,
  0.1 * window.innerWidth,
  0.1 * window.innerWidth
];
const width = 0.6 * window.innerWidth;
const height = 0.6 * window.innerHeight;
const duration = 120000; // 120000 milliseconds == 2 minutes
let now = Date.now();

// X scale will fit all values within the set time interval to window size
// Y scale will fit values from 0-30 within window size
const xScale = d3
  .scaleTime()
  .domain([now - duration, now])
  .range([0, width ]);
const yScale = d3
  .scaleLinear()
  .domain([0, 30])
  .range([height, 0]);

// Create a line function that can convert data into X/Y points
// Assign the X/Y functions to plot our Timestamp/Total
const line = d3
  .line()
  .x(d => xScale(d.timestamp))
  .y(d => yScale(d.total))
  .curve(d3.curveBasis);

// Add an SVG element with the desired dimensions and margin.
const graph = d3
  .select("#graph1")
  .append("svg")
  .attr("width", width + 100)
  .attr("height", height + margins[0] + margins[2]);
const g = graph
  .append("g")
  .attr("transform", "translate(" + margins[3] + "," + margins[0] + ")");

// Add the x-axis
const xAxis = g
  .append("g")
  .attr("class", "axis axis-x")
  .attr("transform", "translate(0," + height + ")")
  .call((xScale.axis = d3.axisBottom().scale(xScale)));

// Add x-axis label
g
  .append("text")
  .attr("transform", "translate(" + width / 2.5 + "," + (height + 50) + ")")
  .style("text-anchor", "middle")
  // .text("Time of Order Submission");

// Add the y-axis
const yAxis = g
  .append("g")
  .attr("class", "axis axis-y")
  .attr("transform", "translate(-25,0)")
  .call((yScale.axis = d3.axisLeft().scale(yScale)));

// Add y-axis label
g
  .append("text")
  .attr("transform", "rotate(-90)")
  .attr("y", 0 - margins[2])
  .attr("x", 0 - height / 2)
  .style("text-anchor", "middle")
  // .text("Order Total ($)");

function buildTable(enigines) {
  const table = document.getElementById("eniginestable");
  const tablePromise = new Promise((resolve, reject) => {
    for (const enigine of enigines) {
      buildRow(table, enigine);
    }
    resolve("built table");
  });
  return tablePromise;
}

function buildRow(table, enigine, index) {
  // Pre-process enigine data
  if (enigine._id) {
    enigine.name = enigine._id;
    delete enigine._id;
  }
  // Create a new table row with two columns
  let tr = document.createElement("tr");
  let name = document.createElement("td");
  let count = document.createElement("td");
  tr.className = "table-data";
  count.className = "centered";

  // Compose elements and add data
  tr.appendChild(name);
  tr.appendChild(count);
  name.innerText = enigine.name;
  count.innerText = enigine.count;

  // Add the row at the specified index, or append it to the end if no index is provided.
  if (!index) {
    table.appendChild(tr);
  } else {
    var nextRow;
    var tempNextRow;
    const numRows = document.querySelectorAll(".table-data").length;
    var isBottomRow = index >= numRows;

    if (!isBottomRow) {
      nextRow = table.querySelector(
        ".table-data:nth-child(" + (index + 1) + ")"
      );
    } else {
      tempNextRow = buildRow(table, { name: "", count: "" }); // No index argument, so append to the bottom
      nextRow = tempNextRow;
    }

    table.insertBefore(tr, nextRow);
    if (tempNextRow) {
      tempNextRow.parentElement.removeChild(tempNextRow);
      tempNextRow = undefined;
    }
  }
  return tr;
}

function refreshTable(newenigines) {
  const refreshTablePromise = new Promise((resolve, reject) => {
    const enigineList = newenigines.map(enigine => ({
      name: enigine._id,
      count: enigine.count
    }));
    resolve(enigineList);
  }).then(enigines => {
    const table = document.getElementById("eniginestable");
    for (let [index, row] of enigines.entries()) {
      index = index + 1;
      const tr = document.querySelector(
        "tr.table-data:nth-of-type(" + index + ")"
      );
      buildRow(table, row, index);
      tr.parentElement.removeChild(tr);
    }
  });
  return refreshTablePromise;
}

function buildGraph(salesTimeline) {
  // Use Stitch to pull the latest data and then graph it
  var graphPromise = new Promise((resolve, reject) => {
    var SalesLine = salesTimeline.map(doc => ({
      timestamp: doc["timestamp"],
      total: doc["total"]
    }));

    // Plot the data
    g.path = g
      .append("path")
      .datum(SalesLine)
      .attr("stroke", "mediumturquoise")
      .attr("d", line);

    resolve({ path: g.path, salesLine: SalesLine });
  });
  return graphPromise;
}

function refreshGraph(salesLine, path, newSalesTimeline) {
  const refreshGraphPromise = new Promise((resolve, reject) => {
    let now = Date.now();
    var newPts = newSalesTimeline.map(doc => ({
      timestamp: doc.timestamp,
      total: doc.total
    }));

    if (newPts.length > 0) {
      // Add new Sales points and remove old points
      for (let pt of newPts) {
        path.datum().push(pt);
        path.attr("d", line);
      }
      // Slide x-axis left
      xScale.domain([now - duration, now]);
      xScale.domain()
      xAxis
        .transition()
        .duration(500)
        .call(xScale.axis);
      // Slide path
      path
        .transition()
        .duration(500)
        .attr("d", line);
      while (path.datum()[0].timestamp < now - duration) {
        path.datum().shift();
      }
    } else {
      newPts = [salesLine[salesLine.length - 1]];
    }

    resolve({
      path: g.path,
      salesLine: newPts
    });
  });
  return refreshGraphPromise;
}
