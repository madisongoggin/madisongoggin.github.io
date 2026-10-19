
 /**
* Secure Portfolio Visualization Module
* Handles data parsing, state management, v7 chart rendering, accessibility attributes, and interactivity.
*/

function tagClean(t) {
 if (String(t).includes(',')) {
    return Array.from(new Set(t.map((e) => (e.split(',').map((i) => i.trim())))))
 }
 return Array.from(String(t.trim()))
}


class PortfolioLoader {
   // Class constructor triggers the parallel download
  constructor() {
    this.ready = this.#init();
   this.requestHeader = new Headers({'Accept' : 'text'});
  }
 async #init() {
    // Downloads and populates raw data caches asynchronously
    this._cell = await d3.json('./data/cells.json');
    this._tags = await d3.json('./data/tags.json');
    // Fetch as raw text and parse rows manually to avoid any eval usage
    this._rawCert = await this.#fetchAndParseCSV('./data/certification.csv');
    this._rawEdu = await this.#fetchAndParseCSV('./data/education.csv');
    this._rawService = await this.#fetchAndParseCSV('/data/professional_service.csv');
    this._rawPosition = await this.#fetchAndParseCSV('./data/position.csv');
    this._posBullets = await this.#fetchAndParseCSV('./data/position_bullet.csv');
    this._award = await this.#fetchAndParseCSV('./data/professional_award.csv');
    this._project = await this.#fetchAndParseCSV('./data/projects.csv');
  }



  async #fetchAndParseCSV(url) {
    try {
    // 1. Download the file purely as raw string text
    const request = new Request(url)

    const response = await  fetch(request, this.reqHeader)

     if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    // 2. Parse into a simple matrix of strings: [["header1", "header2"], ["row1col1", "row1col2"]]
    // d3.csvParseRows is explicitly CSP-safe.

    const returnedData = await response.text()
    const rows = d3.csvParseRows(returnedData)

    if (rows.length === 0) return [];

    // 3. Extract the headers (first row)
    const headers = rows[0];

    // 4. Map the remaining rows into objects and apply type casting manually
    return rows.slice(1).map(rowValues => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = this.#cleanValue(rowValues[index]);
      });
      return obj;
    });
   } catch (error) {
    console.error("Failed to fetch and parse with:", error);
    }
  }

  /**
   * Inline data coercion replacing d3.autoType safely
   */
  #cleanValue(value) {
    if (value === null || value === undefined || value.trim() === "") {
      return null;
    }
    // Clean whitespace
    const trimmed = value.trim();

       // Coerce Basic Dates (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return new Date(trimmed);
    }

    // Coerce Numbers
    if (!isNaN(trimmed) && trimmed.length === 1 && !isNaN(parseFloat(trimmed))) {
      return Number(trimmed);
    }
    // Coerce Booleans
    if (trimmed.toLowerCase() === "true") return true;
    if (trimmed.toLowerCase() === "false") return false;



    return trimmed;
  }

  // Getters allow you to access properties directly without parentheses
  get cells() { return this._cell; }
  get tags() { return this._tags; }

 get rawCert() { return this._rawCert }

  get cert() {
    return d3.rollup(this._rawCert, v => tagClean(v.map(d => d.tag_slugs)));
  }

 get rawEdu() { return this._rawEdu }

  get edu() {
    return d3.rollup(this._rawEdu, v => tagClean(v.map(d => d.tag_slugs)));
  }
  get rawService() { return this._rawService }

  get service() {
    return d3.rollup(this._rawService, v => tagClean(v.map(d => d.tag_slugs)))
  }

  get rawProject() { return this._project }

  get project() {
    return d3.rollup(this._project, v => tagClean(v.map(d => d.tags)))
  }

 get rawPosition() { return this._rawPosition }

 get position() { return d3.rollup(  this._rawPosition,  v =>  tagClean(v.map(d => d.tags))) }

 get rawPosBullets() { return  this._posBullets }

  get rawAward() { return this._award }

  get award() {
    return  d3.rollup(this._award, v => tagClean(v.map(d => d.tag_slug)))
  }

  get nodeMap() {
    return new d3.InternSet([...this.cert, ...this.edu, ...this.position, ...this.award, ...this.service, ...this.project]);
  }
}

const portfolioData = new PortfolioLoader()

const config = new Sanitizer({
  attributes: ['class', 'role', 'aria-label']
});

// DOM elements
const tooltip = document.getElementById('floating-tooltip');
const tagFilterSelect = document.getElementById('tag-filter');
const resetBtn = document.getElementById('reset-filters');


const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' })
function formatDate(date) {
  return dateFormat.format(date)
}

function displayTags(tags) {
    const allTags = Array.from(portfolioData.tags);
    return `<dl role='list' class="tag-chips" aria-label="Tags">` +
    String(tags).split(',')
    .map((t) => {
      // Use .find() instead of .filter() to get the single object directly
      const tag = allTags.find(t1 => t1.slug === t.trim());

      // Add a fallback case in case the tag slug isn't found in portfolioData
      if (!tag) return '';

      // Fix the nested double quotes around the CSS variable
       return `<dt> <kbd class="${tag.color}">${tag.name}</dt></kbd> <dd>${tag.category}</dd>`;
    })
    .join(' ') + // Use .join('') to combine the array items without commas
    '</dl>';
}
async function createSections(key)  {
    let page = document.getElementById(key)
    page.class = 'card-grid'
    switch (key) {
        case 'position':
            const postSummary = Array.from(portfolioData.rawPosition)
            const posBullets = Array.from(portfolioData.rawPosBullets)
            const postHTML =  postSummary.map(p => {
              return ```
                <article role='feed' class="card matrix-legend">
                    <h3 class='eyebrow">${p.title}</h3>
                    <samp class='ink-soft'>${p.org_name}</samp>
                    <p>${formatDate(p.start_date)}  - ${formatDate(p.end_Date)} </p>
                    ${displayTags(p.tags)}
                    <dl name='tasks'>
                    <dt>Major Tasks</dt>
                    ${
                      posBullets.filter(
                        b => b.bullet_tag.includes(p.bullet_tag))
                        .map(b => `<dd>${b.bullet_text}</dd>`
                      ).join(' ')
                  }</dl> </article>```
                }).join('<hr />')
            page.setHTML(postHTML, config)
            break;
        case 'cert':
            const certs = Array.from(portfolioData.rawCert);
             const certHtml =  certs.map(c => {
                return ```
                <article role='feed' class="card matrix-legend">
                    <h3 class='eyebrow">$${c.cert_name}</h3>
                    ${displayTags(c.tag_slugs)}
                    <samp class="ink-soft"'>${c.gov_body}</samp>
                    <p>${formatDate(c.earn_date) ?? ''}</p>
                    </article>```
            }).join('<hr />')
            page.setHTML(certHtml, config)
            break;
        case 'edu':
            const ed = Array.from(portfolioData.rawEdu)
          ed.reverse()
          const edHtml = d.map(e => {
               return ```
                <article role='feed' class="card matrix-legend">
                    <h3 class='eyebrow'>${e.degree}</h3>
                    <p class="--ink-soft">${e.scholarship ?? ''}</p>
                    ${displayTags(e.tag_slugs)}
                     <samp class="ink-soft">${e.school}</samp>
                    <p>${e.capiton ?? '' }</p></article>`
              }).join('<hr />')
          page.setHTML(edHtml, config)
            break;
     case 'award':
            const awards =  Array.from(portfolioData.rawAward)
            const awardsHTML = awards.map(a => {
           return ```
                <article role='feed' class="card matrix-legend">
                    <h3 class='eyebrow>'${a.title}</h3>
                    ${displayTags(a.tag_slug)}
                    <samp class="ink-soft"">${a.org_name}</samp>
                    </article>```
            }).join('<hr />')
            page.setHTML(awardsHTML, config);
            break;
        case 'service':
            const services = Array.from(portfolioData.rawService)
            const serviceHTML = services.map(s => {
           return ```
                  <article role='feed' class="card matrix-legend">
                    <h3 class='eyebrow'>${s.title}</h3>
                    <samp class='ink-soft'">${s.org_name}</samp>
                    ${displayTags(s.tag_slugs)}
                     <p class="ink-soft'">
                     ${formatDate(s.start_date)}
                    ' -' ${formatDate(s.end_date) ?? 'Present'}
                    </p>
                    </article>```
            }).join('<hr />')
            page.setHTML(serviceHTML, config)
            break;
        case 'project':
            const projects = Array.from(portfolioData.rawProject);
            const ProjectsHTML =  projects.map(p => {
               return ```
                  <article role='feed' class="card matrix-legend">
                    <h3 class='eyebrow'>
                        ${`<a target="_blank" href="` + p.repo_url + `">${p.name}</a>`?? p.name}
                    </h3>
                        <p class="ink-soft'">${p.status ?? ''} </p>
                       ${displayTags(p.tags)}
                   <samp>${p.description}</samp>
                   ${'<samp><a target="_blank" href="' + p.deploy_url + '>Live demo</a></samp>' ?? ''}
                   </article>`
            }).join('<hr />')
            page.setHTML(ProjectsHTML, config)
            break;
        default:
            return;
    }
    return key;
}

async function createBody() {
    const sections = ['position', 'cert', 'service', 'award', 'edu', 'project']
    const result = await Promise.all(
        sections.map(async (s) => {
            return await createSections(s)
        })
    );
    return result
}


// Populate dropdown filter options
function initFilters() {
    const categories = [...new Set(portfolioData.tags.map(t => t.category))];
    categories.forEach(cat => {
        const optGroup = document.createElement('optgroup');
        optGroup.label = cat.toUpperCase()
        portfolioData.tags
        .filter(t => t.category === cat)
        .forEach(tag => {
            const option = document.createElement('option');
            option.value = tag.slug;
            option.textContent = tag.name;
            option.role = "option"
            optGroup.appendChild(option);
        });
        tagFilterSelect.appendChild(optGroup);
    });
 }

// --- 1. Marey's Train Schedule Timeline Chart ---
function renderMareyChart(filteredCells) {
    const container = document.getElementById('marey-container');
    container.innerHTML = '';



    const width = container.clientWidth || 600;
    const height = container.clientHeight || 350;
    const margin = { top: 20, right: 30, bottom: 40, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    container.setAttribute("width",width)
   container.setAttribute("height", height)
   container.setAttribute("viewBox",  [0, 0, width, height])
  container.setAttribute("role", 'presentation')
   container.setAttribute("ariaLabel", "Marey's Train Schedule style showing cross-systems experience and expertise.")


    // Extract unique X and Y sets
        const xValues = [...new Set(filteredCells.map(d => d.x))].sort();
        const yValues = [...new Set(filteredCells.map(d => d.y))].sort();
        const cats = [... new Set(filteredCells.map(c => c.category))].sort()


        const xScale =  d3.scaleOrdinal(xValues)
        .domain(cats)
        const yScale =  d3.scaleOrdinal(yValues)
        .domain(cats)


        const catScale = d3.scalePoint()
        .domain(cats)

        // Axes

 function xAxis(g) {
  g
 .selectAll("g")
  .attr("transform",`translate(0,${margin.height - margin.Bottom})`)
 .data(filteredCells)
   .call(g => g.append("line")
         .attr("class", (d => d.x))
        .attr('stroke-width', '3')
         .attr('stroke-opacity', '0.7')
        .call(g => g.append("text")
          .attr("x", 12)
            .attr("dy", "0.35em")
    ))
 .append('g')
  .call(g => g.append("line")
         .attr("class", ( d => d.y))
        .attr('stroke-width', '3')
         .attr('stroke-opacity', '0.7')
         .attr("transform", `translate(0,${margin.height - margin.Bottom})`)
         .call(g => g.append("text")
             .attr("x", -12)
            .attr("dy", "0.35em")
     ))
    .call(d3.axisLeft(xScale).tickValues(xValues))
    .call(d3.axisRight(yScale).tickValues(yValues))
  }



  function  yAxis(g) {
    g
    .call(d3.axisTop(catScale).tickValues(cats))
  }

const line = d3.line()
      .x(d => xScale(d.x))
      .y(d => catScale(d.domain))
      .curve(d3.curveMonotoneX);

const line2 = d3.line()
      .x(d => yScale(d.y))
      .y(d => catScale(d.domain))
      .curve(d3.curveMonotoneX);

   const svgBase = d3.select('#marey-container')
    .attr('width', width)
    .attr('height', height)
     .attr('viewBox', [0, 0, width, height])
     .attr("preserveAspectRatio", "none")
     .attr('role', 'presentation')
     .attr('opacity', 1)
    .attr('ariaLabel', "Marey's Train Schedule style showing cross-systems experience and expertise.")
  .call(xAxis)
  .call(yAxis)

 const routes = svgBase
  .append('g')
   .selectAll("g")
   .data(filteredCells)
   .enter()
   .append('g')

  routes.append("path")
      .attr("d", d => line(d))
      .attr("class", "has-toolip")
      .attr("data-tooltip", (d => `Intersection of ${d.x} and ${d.y} with weight count ${d.count}`))
      .attr("text", (d => `Intersection of ${d.x} and ${d.y} with weight count ${d.count}`))
      .enter()
      .append("path")
            .attr("d", d => line2(d))
            .attr("class", (d => ("has-tooltip", d.y)))
            .attr("data-tooltip", (d => `Intersection of ${d.x} and ${d.y} with weight count ${d.count}`))
           .attr("text", (d => `Intersection of ${d.x} and ${d.y} with weight count ${d.count}`))

  routes.append("g")
       .selectAll("circle")
      .attr("class", (d => ("has-tooltip", d.x)))
      .attr('stroke-width', '3')
      .attr('stroke-opacity', '.7')
      .attr("data-tooltip", (d => `Intersection of ${d.x} and ${d.y} with weight count ${d.count}`))
      .attr("r", d => Math.max(6, Math.min(18, Math.sqrt(d.count) * 4)))
      .attr('cx', v => xScale(xValues.indexOf(v.x)))
      .attr('cy', v => yScale(yValues.indexOf(v.y)))

        svgBase.node().removeAttribute('style')
}

        // --- 2. Cascaded d3.treemap Visualization ---
function renderTreemap(filteredCells) {
  let container =document.getElementById('treemap-container');
    container.innerHTML = '';

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 350;



    container.setAttribute("width",width)
   container.setAttribute("height", height)
   container.setAttribute("viewBox",  [0, 0, width, height])
  container.setAttribute("role", 'presentation')
  container.setAttribute("ariaLabel", "Hierarchical treemap of cross-systems experience and expertise")


   const svgBase = d3.select('#treemap-container')
    .attr('width', width)
    .attr('height', height)
      .attr('role', 'presentation')
     .attr('viewBox', [0, 0, width, height])
    .attr('ariaLabel', "Hierarchical treemap of cross-systems experience and expertise")


    const xValues = [...new Set(filteredCells.map(d => d.x))].sort();
    const yValues = [...new Set(filteredCells.map(d => d.y))].sort();
    const vals = [... new Set(xValues, yValues)]
     const cats = [... new Set(filteredCells.map(c => c.category))].sort()
    // Build hierarchical data structure from tags and cells


const data = vals.map(v => {
  return {
        "name" : v,
        "children": filteredCells.filter(c => (c.y == v || c.x == v)),
    }})



function treemap(data) {
     return  d3.treemap()
        .attr('style', null)
        .size([width, height])
        .paddingOuter(3)
        .paddingTop(19)
        .paddingInner(2)
        .round(true)
        (d3.hierarchy({"name" : "root", children: [data]})
        .sum(d => d.count)
        .sort((a, b) => b.count - a.count));
}


      svgBase
      .call(treemap(data))
      .attr('style', null)
      .append("filter")
    .append("feDropShadow")
      .attr("flood-opacity", 0.3)
      .attr("dx", 0)
      .attr("stdDeviation", 3)



       const node = svgBase.selectAll("g")
        .data(d3.group(root, d => d.height))
    .join("g")
    .selectAll("g")
    .data(d => d[1])
    .join("g")
      .attr("transform", d => `translate(${d.x0},${d.y0})`);




              node.append("rect")
      .attr("width", d => d.x1 - d.x0)
      .attr("height", d => d.y1 - d.y0);

        node.append("text")
    .selectAll("tspan")
    .join("tspan")
      .attr("fill-opacity", (d, i, nodes) => i === nodes.length - 1 ? 0.7 : null)
      .text(d => d);

  node.filter(d => d.children).selectAll("tspan")
      .attr("dx", 3)
      .attr("y", 13);

  node.filter(d => !d.children).selectAll("tspan")
      .attr("x", 3)
      .attr("y", (d, i, nodes) => `${(i === nodes.length - 1) * 0.3 + 1.1 + i * 0.9}em`)
      .attr("y", (d, i, nodes) => `${(i === nodes.length - 1) * 0.3 + 1.1 + i * 0.9}em`);


      svgBase.node().removeAttribute("style")



    }




// --- Interactivity & Event Handling ---
function updateVisualizations(selectedSlug) {
        const allCells = portfolioData.cells;
        if (selectedSlug && selectedSlug !== 'all') {
            let filteredCells = allCells.filter(c => c.x === selectedSlug || c.y === selectedSlug)
            if (filteredCells.length != 0) {
             renderMareyChart(filteredCells);
             renderTreemap(filteredCells);
           }
       } else if (selectedSlug) {
        renderMareyChart(allCells);
        renderTreemap(allCells);
    }
}

function filterNodeMap(filteredCells) {
    const nodeMap = new Map(Array.from(portfolioData.nodeMap));
    const allSlugs = Array.from(new Set(filteredCells.map(c => c.x), filteredCells.map(c => c.y)))
    allSlugs.map((s) => {
        return nodeMap.get(s)
    })
 }

function AddTooltips() {
    Array.from(document.getElementsByClassName("has-tooltip")).forEach((target) => {
    target.addEventListener("mouseenter", (e) => {
      const text = target.getAttribute("data-tooltip");
      tooltip.textContent = text;

      // Calculate coordinates relative to the target element
      const rect = target.getBoundingClientRect();

      // Position tooltip above the element, centered horizontally
      const topPosition = rect.top + window.scrollY - tooltip.offsetHeight - 8;
      const leftPosition = rect.left + window.scrollX + (rect.width / 2) - (tooltip.offsetWidth / 2);

      tooltip.style.top = `${topPosition}px`;
      tooltip.style.left = `${leftPosition}px`;

      tooltip.classList.add("tooltip-visible");
    });

    target.addEventListener("mouseleave", () => {
      tooltip.classList.remove("tooltip-visible");
    });
  })
}


tagFilterSelect.addEventListener('change', (e) => {
            updateVisualizations(e.target.value);
});

resetBtn.addEventListener('click', () => {
            tagFilterSelect.value = 'all';
            updateVisualizations('all');
});


window.addEventListener('DOMContentLoaded', () => {
   portfolioData.ready.then(() => {
    Promise.allSettled([
    initFilters(),
    createBody(),
    updateVisualizations('all')])
    }).then(AddTooltips())
});



// Responsive resize listener
window.addEventListener('resize', () => {
    updateVisualizations(tagFilterSelect.value);
})
