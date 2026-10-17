
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
    // 1. Download the file purely as raw string text
    const rawText = await d3.text(url);
    
    // 2. Parse into a simple matrix of strings: [["header1", "header2"], ["row1col1", "row1col2"]]
    // d3.csvParseRows is explicitly CSP-safe.
    const rows = d3.csvParseRows(rawText);
    
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
    if (/^\d{4}/.test(trimmed)) {
      return new Date(trimmed);
    }

    // Coerce Numbers
    if (!isNaN(trimmed) && !isNaN(parseFloat(trimmed))) {
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
      return `<li class="tag-chip" style="--chip: ${tag.color}">${tag.name}</li>`;
    })
    .join('') + // Use .join('') to combine the array items without commas
    '</ul>';
}
async function createSections(key)  {
    let page = document.getElementById(key)
    let card = document.createElement('div')
    card.class = 'card-grid'
    switch (key) {
        case 'position':
            const postSummary = Array.from(portfolioData.rawPosition)
            const posBullets = Array.from(portfolioData.rawPosBullets)
            postSummary.forEach(p => {
             card.setHTML(`<article class="card matrix-legend">
                    <header class='tag-group'>
                    <p class='eyebrow' color='#1a7f37'>${p.title}</p>
                    <p color="#4b5563;'>${p.org_name}</p>
                    <p color= '#0b5fa5;'>` + formatDate(p.start_date) + ' -'  + formatDate(p.end_Date) + `</p>
                    </header>` +
                    displayTags(p.tags) +
                    `<ul class='simple-item">` +
                    d3.sort(
                        d3.filter(posBullets, (b) => b.bullet_tag === p.bullet_tag),
                        (b) => b.bullet_num
                    )
                    .map(b =>
                        `<li class='simple-item">${b.bullet_text}</li>`
                    ).join() + '</ul></article>'
                )
                }
            )
            break;
        case 'cert':
            const certs = Array.from(portfolioData.rawCert);
            certs.forEach(c => {
            card.setHTML(`<article class="card matrix-legend">
                    <header class='tag-group'>
                    <p class='eyebrow' color='#1a7f37>${c.cert_name}</p>` +
                    displayTags(c.tag_slugs) +
                    `</header>
                    <p color="#4b5563;'>${c.gov_body}</p>` +
                    c.earn_date ? `<p>`+ formatDate(c.earn_date) +` </p>` : `` +
                    `</article>`
            )
        })
            break;
        case 'edu':
            const ed = Array.from(portfolioData.rawEdu)
            ed.forEach(e => {
             card.setHTML(
                `<article class="matrix-legend card">
                    <header class='tag-group'>
                    <p class='eyebrow' color='#1a7f37>${e.degree}</p>` +
                    e.scholarship ? `<p color="#4b5563;'>>${e.scholarship}</p>` : `` +
                    displayTags(e.tag_slugs) +
                    `</header>
                     <p color="#4b5563;'>${e.school}</p>` +
                     e.capiton ? `<p>${e.capiton}</p>` : `` +
                    `</article>`
                )
                card.appendChild(child)
            })
            break;
     case 'award':
            const awards =  Array.from(portfolioData.rawAward)
            awards.forEach(a => {
             card.setHTML(`<article class="card matrix-legend">
                    <header class='tag-group'>
                    <p class='eyebrow' color='#1a7f37;'>${a.title}</p>` +
                    displayTags(a.tag_slug) +
                    `</header>
                    <p color="#4b5563;'>${a.org_name}</p>
                    </article>`
            )
        })
        break;
        case 'service':
            const services = Array.from(portfolioData.rawService)
            services.foreach(s => { 
             card.setHTML(`<article class="card matrix-legend">
                    <header class='tag-group'>
                    <p class='eyebrow' color='#1a7f37;'>${s.title}</p>
                    <p color ='#0b5fa5;'>${s.org_name}</p>` +
                    displayTags(s.tag_slugs) +
                    `</header>
                    <p  color="#4b5563;">` +
                 formatDate(s.start_date) +
             s.end_date ? ' -' + formatDate(s.end_date) : '' +
                    `</p>
                    </article>`
            )
        });

        break;
        case 'project':
            const projects = Array.form(portfolioData.rawProject);
            projects.forEach(p => {
             card.setHTML(`<article class="card matrix-legend">
                    <header class = 'tag-group'>
                        <p class='eyebrow' color='#1a7f37'>` +
                        p.repo_url ? `<a target="_blank" href="${p.repo_url}">${p.name}</a>` : p.name
                    `</p>` +
                        p.status ? `<p color="#4b5563;">${p.status }}</p>` : ``  +
                        displayTags(p.tags) +
                `</header>
                <p>${p.description}</p>` +
                   p.deploy_url ? `<p class="card-links"><a target="_blank" href=${p.deploy_url}">Live demo</a></p>` : ``
               + `</article>`
            )
        });
            break;
        default:
            return;
    }
    page.appendChild(card);
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
function renderMareyChart(filteredCells, nodeMap) {
    const container = document.getElementById('marey-container');
    container.innerHTML = '';

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 350;
    const margin = { top: 20, right: 30, bottom: 40, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
                    
        // Axes
let svg = document.createElement('svg')
   svg.width = width
   svg.height = height
   svg.viewBox =  [0, 0, width, height]
   svg.role='img'
   svg.ariaLabel = "Marey's Train Schedule style showing cross-systems experience and expertise."
         
   const anyG = document.createElement('g')

    let g =  anyG
     g.transform=`translate(${margin.left},${margin.top})`

    // Extract unique X and Y sets
        const xValues = [...new Set(filteredCells.map(d => d.x))].sort();
        const yValues = [...new Set(filteredCells.map(d => d.y))].sort();

        let scaleFactor = innerWidth / xValues.length
        const xScale =  Array.from(xValues, (e, i) => { (i + 1)  * scaleFactor})
        scaleFactor = innerWidth / yValues.length
        const yScale =  Array.from(yValues, (e, i) => { (i + 1)  * scaleFactor})                       


        // Axes
       let xG = anyG
       xG.transform = `translate(0,${innerHeight})`
       d3.axisBottom(xScale).call(xG)
       Array.from(xG.getElementsByTagName('text')).forEach(t => {
        t.class = 'text-xs text-slate-600'
        t.style = 'text-anchor, middle'
       })
      g.append(xG)
         
       let yG = anyG
        d3.axisBottom(yScale).call(yG)
       Array.from(yG.getElementsByTagName('text')).forEach(t => {
        t.class = 'text-xs text-slate-600'
       })
       yG.text.class = 'text-xs text-slate-600'
       
      g.append(yG)

      let gridG = anyG
      gridG.class ='grid opacity-15'
      gridG.call(d3.axisLeft(yScale).tickSize(-innerWidth).tickFormat(''))

      g.append(gridD)

      let dataG = anyG
      dataG.fill = 'none'
      dataG.stoke = 'none'
      dataG.dataset = filteredCells;

      g.append(dataG)

      const line = d3.line()
      .x(v => xScale.at(xValues.indexOf(v)))
      .y(v => yScale.at(yValues.indexOf(v)))
      .stroke()
      .curve(d3.curveMonotoneX);

      let pathG = anyG;
      pathG.fill = 'none'
      pathG.setAttribute('stroke-width', '3')
      pathG.setAttribute('stroke-opacity', '4')
      pathG.d = line(filteredCells)
      pathG.onfocus((e, d) => {
        showTooltip(`Intersection of ${d.x} and ${d.y} with weight count ${d.count}`)
      })
      pathG.onmouseleave((e), hideTooltip())
      pathG.onmousemove(e => updateTooltipPosition())
      pathG.onblur(e => hideTooltip())

            g.append(pathG);

      let circle = document.createElement('circle')
      circle.r = (d => Math.max(6, Math.min(18, Math.sqrt(d.count) * 4)))
      circle.fill = ( d => d.color || '#3b82f6')
      circle.stroke = '#ffffff'
      circle.setAttribute('stroke-width', '3')
      circle.class = "transition-transform duration-200 group-hover:scale-125"
      circle.onfocus((e, d) => {
        showTooltip(`Intersection of ${d.x} and ${d.y} with weight count ${d.count}`)
      })
      circle.onmouseleave((e), hideTooltip())
      circle.onmousemove(e => updateTooltipPosition())
      circle.onblur(e => hideTooltip())

      g.append(circle)

}

        // --- 2. Cascaded d3.treemap Visualization ---
function renderTreemap(filteredCells, nodeMap) {
    const container = document.getElementById('treemap-container');
    container.innerHTML = '';

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 350;
   
 let svg = document.createElement('svg')
   svg.width = width
   svg.height = height
   svg.viewBox =  [0, 0, width, height]
   svg.role='img'
   svg.ariaLabel = "Hierarchical treemap of cross-systems experience and expertise"

    // Build hierarchical data structure from tags and cells
    const  hierarchicalData = {
           name: "Root",
                children: [...new Set(filteredCells.x, filteredCells.y).map(tag => {
                    return {
                        name: tag,
                        children: nodeMap.get(tag)
                        }
                })]
            };

    const root = d3.hierarchy(hierarchicalData)
                .sort((a, b) => b.count - b.count);

    d3.treemap()
        .size([width, height])
        .paddingOuter(3)
        .paddingInner(2)
        (root);

    const leaf = container.selectAll('g')
            .data(root.leaves())
            .join('g')
            .attr('transform', d => `translate(${d.x0},${d.y0})`)
            .attr('tabindex', '0')
            .attr('role', 'button')
            .attr('aria-label', d => `Skill ${d.parent.name} with depth ${d.depth}`);

    leaf.append('rect')
        .attr('fill', d => d.parent.color)
        .attr('fill-opacity', 0.8)
        .attr('width', d => Math.max(0, d.x1 - d.x0))
        .attr('height', d => Math.max(0, d.y1 - d.y0))
        .attr('class', 'rounded-xs cursor-pointer hover:fill-opacity-100 transition-opacity');

    leaf.append('text')
            .attr('x', 4)
            .attr('y', 14)
            .text(d => `Skill ${d.parent.name} with depth ${d.depth}`)
            .attr('class', 'text-[10px] font-semibold fill-white drop-shadow-xs pointer-events-none');

 container.append(svg)
    }


// --- Interactivity & Event Handling ---
function updateVisualizations(selectedSlug) {
        const allCells = portfolioData.cells;
        if (selectedSlug && selectedSlug !== 'all') {
            let filteredCells = allCells.filter(c => c.x === selectedSlug || c.y === selectedSlug)
            if (filteredCells.length != 0) {
             renderMareyChart(filteredCells, filterNodeMap(filteredCells));
             renderTreemap(filteredCells, filterNodeMap(filteredCells));
           }
       } else if (selectedSlug) {
        renderMareyChart(allCells, filterNodeMap(allCells));
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
