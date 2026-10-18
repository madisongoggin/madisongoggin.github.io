
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

const formatDate = d3.timeFormat("%b %Y");
// Validate and sanitize incoming data structure

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

const config = new Sanitizer({})
config.allowAttribute('class')
config.allowAttribute('style')
config.allowAttribute('aria-label')
config.setComments(true)


// DOM elements
const tooltip = document.getElementById('floating-tooltip');
const tagFilterSelect = document.getElementById('tag-filter');
const resetBtn = document.getElementById('reset-filters');

function displayTags(tags) {
    const allTags = Array.from(portfolioData.tags);
    return `<ul class="tag-chips aria-label="Tags">` +
    String(tags).split(',')
    .map((t) => {
      // Use .find() instead of .filter() to get the single object directly
      const tag = allTags.find(t1 => t1.slug === t.trim());

      // Add a fallback case in case the tag slug isn't found in portfolioData
      if (!tag) return '';

      // Fix the nested double quotes around the CSS variable
      return `<li class="tag-chip" style="color : ${tag.color}'">${tag.name}</li>`;
    })
    .join('') + // Use .join('') to combine the array items without commas
    '</ul>';
}
async function createSections(key)  {
    let page = document.getElementById(key)
    page.class = 'card-grid'
    switch (key) {
        case 'position':
            const postSummary = Array.from(portfolioData.rawPosition)
            const posBullets = Array.from(portfolioData.rawPosBullets)
            page.setHTML(
            postSummary.map(p => {
              `<article class="card matrix-legend">
                    <header class='tag-group'>
                    <p class='eyebrow' style="color: '--accent'">${p.title}</p>
                    <p style='color: "--ink-soft"'>${p.org_name}</p>
                    <p>` + formatDate(p.start_date) + ' - '  + formatDate(p.end_Date) + `</p>
                    </header>` +
                    displayTags(p.tags) +
                    `<ul class='simple-item">` +
                    (posBullets.filter(b => b.bullet_tag.includes(p.bullet_tag)).map(b => {
                       return `<li class='simple-item">${b.bullet_text}</li>`
                  }).join('')  || p.bullet_tag) + '</ul></article>'
                  }).join(''), config
            )
            break;
        case 'cert':
            const certs = Array.from(portfolioData.rawCert);
            page.setHTML(
            certs.map(c => {
                `<article class="card matrix-legend">
                    <header class='tag-group'>
                    <p class='eyebrow' style="color: '--accent'">${c.cert_name}</p>` +
                    displayTags(c.tag_slugs) +
                    `</header>
                    <p  style='color:"--ink-soft"'>${c.gov_body}</p>` +
                    c.earn_date ? `<p>`+ formatDate(c.earn_date) +` </p>` : `` +
                    `</article>`
            }).join(''), config
          )
            break;
        case 'edu':
            const ed = Array.from(portfolioData.rawEdu)
          ed.reverse()
          page.setHTML(
            ed.map(e => {
               `<article class="matrix-legend card">
                    <header class='tag-group'>
                    <p class='eyebrow' style="color:'--accent'">${e.degree}</p>` +
                    e.scholarship ? `<p style="color : "--ink-soft"">${e.scholarship}</p>` : `` +
                    displayTags(e.tag_slugs) +
                    `</header>
                     <p style="color : "--ink-soft"">${e.school}</p>` +
                     e.capiton ? `<p>${e.capiton}</p>` : `` +
                    `</article>`, config
              }).join(''), config)
            break;
     case 'award':
            const awards =  Array.from(portfolioData.rawAward)
            page.setHTML(
            awards.map(a => {
           `<article class="card matrix-legend">
                    <header class='tag-group'>
                    <p class='eyebrow' style='color: "--accent"'>${a.title}</p>` +
                    displayTags(a.tag_slug) +
                    `</header>
                    <p style="color : "--ink-soft"">${a.org_name}</p>
                    </article>`
            }).join(''), config)
            break;
        case 'service':
            const services = Array.from(portfolioData.rawService)
            page.setHTML(
            services.map(s => {
            `<article class="card matrix-legend">
                    <header class='tag-group'>
                    <p class='eyebrow' style="color: '--accent'">${s.title}</p>
                    <p style="color: '--ink-soft'">${s.org_name}</p>` +
                    displayTags(s.tag_slugs) +
                    `</header>
                    <p style='color: "--ink-soft'">` +
                 formatDate(s.start_date) +
             s.end_date ? ' -' + formatDate(s.end_date) : '' +
                    `</p>
                    </article>`
            }).join(''), config);
            break;
        case 'project':
            const projects = Array.from(portfolioData.rawProject);
            page.setHTML(
            projects.map(p => {
               `<article class="card matrix-legend">
                    <header class = 'tag-group'>
                        <p class='eyebrow'  style='color: '--accent'' >` +
                        p.repo_url ? `<a target="_blank" href="${p.repo_url}">${p.name}</a>` : p.name
                    `</p>` +
                        p.status ? `<p style="color: '--ink-soft'">${p.status }}</p>` : ``  +
                        displayTags(p.tags) +
                `</header>
                <p>${p.description}</p>` +
                   p.deploy_url ? `<p><a target="_blank" href=${p.deploy_url}">Live demo</a></p>` : ``
               + `</article>`
            }).join(''), config)
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
        optGroup.label = cat.toUpperCase();
        portfolioData.tags
        .filter(t => t.category === cat)
        .forEach(tag => {
            const option = document.createElement('option');
            option.value = tag.slug;
            option.textContent = tag.name;
            optGroup.appendChild(option);
        });
        tagFilterSelect.appendChild(optGroup);
    });
 }

function updateTooltipPosition(event) {
        const pad = 15;
        const x = event.pageX + pad;
        const y = event.pageY + pad;
        tooltip.style.left = `${Math.min(window.innerWidth - tooltip.offsetWidth - 20, x)}px`;
        tooltip.style.top = `${Math.min(window.innerHeight - tooltip.offsetHeight - 20, y)}px`;
}

function hideTooltip() {
    tooltip.setAttribute('aria-hidden', 'true');
    tooltip.classList.remove('opacity-100', 'scale-100');
    tooltip.classList.add('opacity-0', 'scale-95');
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

    container.width = width
   container.height = height
  container.viewBox =  [0, 0, width, height]
   container.role='img'
   container.ariaLabel = "Marey's Train Schedule style showing cross-systems experience and expertise."


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
         .attr("stroke", ( d => d.color || '#3b82f6'))
        .attr('stroke-width', '3')
         .attr('stroke-opacity', '4')
        .call(g => g.append("text")
          .attr("x", 12)
          .attr("class", 'text-xs text-slate-600')
            .attr("dy", "0.35em")
    ))
 .append('g')
  .call(g => g.append("line")
         .attr("stroke", ( d => d.color || '#3b82f6'))
        .attr('stroke-width', '3')
         .attr('stroke-opacity', '4')
         .attr("transform", `translate(0,${margin.height - margin.Bottom})`)
         .call(g => g.append("text")
             .attr("x", -12)
             .attr("class", 'text-xs text-slate-600')
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
    .append("svg")
    .attr('width', width)
    .attr('height', height)
     .attr('viewBox', [0, 0, width, height])
     .attr('role', 'img')
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
      .attr("fill", "none")
      .attr("d", d => line(d))
            .on('focus', (e, d) => {
        showTooltip(`Intersection of ${d.x} and ${d.y} with weight count ${d.count}`)
      })
                   .on('click', (e, d) => {
        showTooltip(`Intersection of ${d.x} and ${d.y} with weight count ${d.count}`)
      })
      .on('mousemove', updateTooltipPosition)
      .on('mouseleave', hideTooltip)
      .enter()
      .append("path")
            .attr("d", d => line2(d))
            .on('focus', (e, d) => {
        showTooltip(`Intersection of ${d.x} and ${d.y} with weight count ${d.count}`)
      })
                   .on('click', (e, d) => {
        showTooltip(`Intersection of ${d.x} and ${d.y} with weight count ${d.count}`)
      })
      .on('mousemove', updateTooltipPosition)
      .on('mouseleave', hideTooltip)

  routes.append("g")
       .selectAll("circle")
      .attr("stroke", '#ffffff')
      .attr("fill", d => d.color)
      .attr('stroke-width', '3')
      .attr('stroke-opacity', '4')
      .attr("r", d => Math.max(6, Math.min(18, Math.sqrt(d.count) * 4)))
      .attr('cx', v => xScale(xValues.indexOf(v.x)))
       .attr('cy', v => yScale(yValues.indexOf(v.y)))
            .on('focus', (e, d) => {
        showTooltip(`Intersection of ${d.x} and ${d.y} with weight count ${d.count}`)
      })
                   .on('click', (e, d) => {
        showTooltip(`Intersection of ${d.x} and ${d.y} with weight count ${d.count}`)
      })
            .on('mousemove', updateTooltipPosition)
            .on('mouseleave', hideTooltip)

    container.append(svgBase.node())
}

        // --- 2. Cascaded d3.treemap Visualization ---
function renderTreemap(filteredCells, nodeMap) {
    const container = document.getElementById('treemap-container');
    container.innerHTML = '';

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 350;

 container.width = width
  container.height = height
   container.viewBox =  [0, 0, width, height]
   container.role='img'
   container.ariaLabel = "Hierarchical treemap of cross-systems experience and expertise"

   const svgBase = d3.select('#treemap-container')
    .append("svg")
    .attr('width', width)
    .attr('height', height)
     .attr('viewBox', [0, 0, width, height])
     .attr('role', 'img')
    .attr('ariaLabel', "Hierarchical treemap of cross-systems experience and expertise")


    // Build hierarchical data structure from tags and cells
    const  hierarchicalData = {
           name: "Root",
                children: [...new Set(filteredCells.x, filteredCells.y)].map(tag => {
                    return {
                        name: tag,
                        children: nodeMap.get(tag)
                        }
                })
            };

    const root = d3.hierarchy(hierarchicalData)
                .sort((a, b) => b.count - a.count);

   const tree = d3.treemap()
        .size([width, height])
        .paddingOuter(3)
        .paddingInner(2)
        (root);

    const leaf =  svgBase.selectAll('g')
            .data(root.leaves())
            .enter()
            .append('g')
            .attr('transform', d => `translate(${d.x0},${d.y0})`)
            .attr('tabindex', '0')
            .attr('role', 'button')
            .attr('aria-label', d => `Skill ${d.parent.name} with depth ${d.depth}`)
            .on('focus', (e, d) => {
        showTooltip(`Skill ${d.parent.name} with depth ${d.depth}`)
      })
                   .on('click', (e, d) => {
        showTooltip(`Skill ${d.parent.name} with depth ${d.depth}`)
      })
            .on('mousemove', updateTooltipPosition)
            .on('mouseleave', hideTooltip)

    leaf.append('rect')
        .attr('fill', d => d.parent.color)
        .attr('fill-opacity', 0.8)
        .attr('width', d => Math.max(0, d.x1 - d.x0))
        .attr('height', d => Math.max(0, d.y1 - d.y0))
        .attr('class', 'rounded-xs cursor-pointer hover:fill-opacity-100 transition-opacity')
             .on('focus', (e, d) => {
        showTooltip(`Skill ${d.parent.name} with depth ${d.depth}`)
      })
                   .on('click', (e, d) => {
        showTooltip(`Skill ${d.parent.name} with depth ${d.depth}`)
      })
            .on('mousemove', updateTooltipPosition)
            .on('mouseleave', hideTooltip)


    leaf.append('text')
            .attr('x', 4)
            .attr('y', 14)
            .text(d => `Skill ${d.parent.name} with depth ${d.depth}`)
            .attr('class', 'text-[10px] font-semibold fill-white drop-shadow-xs pointer-events-none')
             .on('focus', (e, d) => {
        showTooltip(`Skill ${d.parent.name} with depth ${d.depth}`)
      })
                   .on('click', (e, d) => {
        showTooltip(`Skill ${d.parent.name} with depth ${d.depth}`)
      })
            .on('mousemove', updateTooltipPosition)
            .on('mouseleave', hideTooltip)

    container.append(svgBase.node())

    }




// --- Interactivity & Event Handling ---
function updateVisualizations(selectedSlug) {
        const allCells = portfolioData.cells;
        if (selectedSlug && selectedSlug !== 'all') {
            let filteredCells = allCells.filter(c => c.x === selectedSlug || c.y === selectedSlug)
            if (filteredCells.length != 0) {
             renderMareyChart(filteredCells);
             renderTreemap(filteredCells, filterNodeMap(filteredCells));
           }
       } else if (selectedSlug) {
        renderMareyChart(allCells);
        renderTreemap(allCells, filterNodeMap(allCells));
    }
}

function filterNodeMap(filteredCells) {
    const nodeMap = new Map(Array.from(portfolioData.nodeMap));
    const allSlugs = Array.from(new Set(filteredCells.map(c => c.x), filteredCells.map(c => c.y)))
    allSlugs.map((s) => {
        return nodeMap.get(s)
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
    Promise.any([
    initFilters(),
    createBody(),
    updateVisualizations('all')])
    })
});

// Responsive resize listener
window.addEventListener('resize', () => {
    updateVisualizations(tagFilterSelect.value);
})
