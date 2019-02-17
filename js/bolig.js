"use strict";


var storage = {};

const host = "https://storage.googleapis.com/ba7e2966-31de-11e9-819c-b3b1d3be419b/www/";


// ...

function filter(obj, csv) {
    
    const d = obj.delimiter;
    
    let ar = [];
    
    return csv.split("\n").filter(c => c.length > 0).map((c) => c.split(d));
}


// sameFilter: "same as last"

function sameFilter(ar) {
    
    const j = ar.findIndex(c => c > 0);
    
    ar[0] = (j >= 0) ? ar[j] : 0.01;
        
    return [ar[0]].concat(ar.map((c,i) => { if (c === 0) { ar[i] = ar[i-1]; }; return ar[i]; }).slice(1));
}


// source: https://beta.observablehq.com/@mbostock/d3-multi-line-chart

     
function multiLine(id, data) {
    
    function hover(svg, path) {
        svg
            .style("position", "relative");
        
        if ("ontouchstart" in document) svg
            .style("-webkit-tap-highlight-color", "transparent")
            .on("touchmove", moved)
            .on("touchstart", entered)
            .on("touchend", left)
        else svg
            .on("mousemove", moved)
            .on("mouseenter", entered)
            .on("mouseleave", left);

        const dot = svg.append("g")
            .attr("display", "none");

        dot.append("circle")
            .attr("r", 2.5);

        dot.append("text")
            .style("font", "10px sans-serif")
            .attr("text-anchor", "middle")
            .attr("y", -8);

        function moved() {
            d3.event.preventDefault();
            const ym = y.invert(d3.event.layerY);
            const xm = x.invert(d3.event.layerX);
            const i1 = d3.bisectLeft(data.dates, xm, 1);
            const i0 = i1 - 1;
            const i = xm - data.dates[i0] > data.dates[i1] - xm ? i1 : i0;
            const s = data.series.reduce((a, b) => Math.abs(a.values[i] - ym) < Math.abs(b.values[i] - ym) ? a : b);
            path.attr("stroke", d => d === s ? null : "#ddd").filter(d => d === s).raise();
            dot.attr("transform", `translate(${x(data.dates[i])},${y(s.values[i])})`);
            dot.select("text").text(s.name);
        }

        function entered() {
            path.style("mix-blend-mode", null).attr("stroke", "#ddd");
            dot.attr("display", null);
        }

        function left() {
            path.style("mix-blend-mode", "multiply").attr("stroke", null);
            dot.attr("display", "none");
        }
    }


    const width = 975;
    const height = 600;
    const margin = ({top: 20, right: 20, bottom: 30, left: 40});

    const x = d3.scaleTime()
        .domain(d3.extent(data.dates))
        .range([margin.left, width - margin.right]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data.series, d => d3.max(d.values))]).nice()
        .range([height - margin.bottom, margin.top]);

    const xAxis = g => g
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).ticks(width / 80).tickSizeOuter(0));

    const yAxis = g => g
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y))
        .call(g => g.select(".domain").remove())
        .call(g => g.select(".tick:last-of-type text").clone()
            .attr("x", 3)
            .attr("text-anchor", "start")
            .attr("font-weight", "bold")
            .text(data.y));

    const line = d3.line()
        .defined(d => !isNaN(d))
        .x((d, i) => x(data.dates[i]))
        .y(d => y(d));


    const svg = d3.select("#" + id).append("svg")
        .attr("width", width)
        .attr("height", height);
        
    svg.append("g")
        .call(xAxis);

    svg.append("g")
        .call(yAxis);

    const path = svg.append("g")
        .attr("fill", "none")
        .attr("class", "stroke-1")
//         .attr("stroke", "steelblue")
//         .attr("stroke-width", 1.5)
//         .attr("stroke-linejoin", "round")
//         .attr("stroke-linecap", "round")
    .selectAll("path")
    .data(data.series)
    .join("path")
        .style("mix-blend-mode", "multiply")
        .attr("d", d => line(d.values)); 
        
    svg.append("g").append("text")
        .attr("x", (width / 2))             
        .attr("y", margin.top)
        .attr("text-anchor", "middle")  
        .style("font-size", "16px") 
        .text(data.title);    

    svg.call(hover, path);  // hover(svg, path);

    svg.node();

}


// ...

function draw(diag, obj) {

    if (diag === "multiline") {
        
        let data = storage[obj.id].map((c) => { return {"o": c[0], "v": Number(c[1])}; });
        
        data = _.groupBy(data, obj.groupkey);  // f.eks. omr20    

        let keys = Object.keys(data);

        let series = keys.map((c) => { return { "name": c, "values": sameFilter( data[c].map(b => b["v"])) }; });
        
        if (! storage.hasOwnProperty("dates")) {
        
            // NOTE we know that all data starts with first date 2004M1, and data is sorted in sqlite3 by tid
            
            storage.dates = (series[0].values).map((c,i) => new Date(2004, i, 28));
        }

        multiLine("multiline", {"dates": storage.dates, "y": obj.y_legend, "title": obj.title, "series": series});
    }
}


// ...

function dataDraw(obj) {
    
    if (storage.hasOwnProperty(obj.id)) {
        
        draw("multiline", obj);
        
        
    } else {    

        $.ajax({"method": "GET", "url": host + obj.file, "dataType": "text"}).then((r) => {
            
            storage[obj.id] = filter(obj, r);
                        
            draw("multiline", obj);
            
        });
    }
}  


// obj: {statement: "sql statement", y_legend: "m2 DKK price", key: "price" , groupkey: "omr20" }

var obj = {"id": "pris_hus_kommune", "file": "pris-hus-kommune.csv", "title": "Realiseret huspriser (actual house prices)" ,"delimiter": "|", "y_legend": "DKK pris (price) /m2", "text": {"dk": "Parcel- og rækkehuse realiseret priser DKK/m2 i kommuner, regioner og landsdele", "en": "" }, "groupkey": "o", "key": "v"};

dataDraw(obj);


obj = {"id": "pris_lejlighed_kommune", "file": "pris-lejlighed-kommune.csv", "delimiter": "|", "y_legend": "DKK pris (price) /m2", "text": {"dk": "Ejerlejligheder realiseret priser DKK/m2 i kommuner, regioner og landsdele", "en": "" }, "groupkey": "o", "key": "v"};

// dataDraw(obj);


obj = {"id": "pris_fritidshus_kommune", "file": "pris-fritidshus-kommune.csv", "delimiter": "|", "y_legend": "DKK pris (price) /m2", "text": {"dk": "Fritidshuse realiseret priser DKK/m2 i kommuner, regioner og landsdele", "en": "" }, "groupkey": "o", "key": "v"};

// dataDraw(obj);



































































