
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

class CSVParser {
    constructor() {
        this.QUOTE = '"';
    }

    #cleanValue(value) {
        if (value === null || value === undefined) {
            return null;
        }

        let trimmed = value.trim();

        // Strip outer wrapping quotes if present
        if (trimmed.startsWith(this.QUOTE) && trimmed.endsWith(this.QUOTE)) {
            trimmed = trimmed.slice(1, -1).trim();
        }

        if (trimmed === "") {
            return null;
        }

        // Coerce Basic Dates (YYYY-MM-DD)
        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
            return new Date(trimmed);
        }

        // Coerce Numbers (ensure it's numeric and not empty)
        if (!isNaN(trimmed) && trimmed.length > 0 && !isNaN(parseFloat(trimmed))) {
            return Number(trimmed);
        }

        // Coerce Booleans
        if (trimmed.toLowerCase() === "true") return true;
        if (trimmed.toLowerCase() === "false") return false;

        return trimmed;
    }

    // Quote-aware line splitter that ignores commas inside quoted strings
    #parseLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === this.QUOTE) {
                inQuotes = !inQuotes;
                current += char;
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current);
        return result;
    }

    parse(csvText) {
        // Handle both Windows (\r\n) and Unix (\n) line endings safely
        const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== "");
        if (lines.length === 0) return [];

        // Parse header and remove any wrapping quotes from column names
        const header = this.#parseLine(lines[0]).map(h => h.replace(/^"|"$/g, '').trim());

        // Use .map() to return the array of cleaned row objects
        const content = lines.slice(1).map((row) => {
            const cleanedLine = {};
            const values = this.#parseLine(row);

            values.forEach((c, colIndex) => {
                const colName = header[colIndex];
                if (colName) {
                    cleanedLine[colName] = this.#cleanValue(c);
                }
            });
            return cleanedLine;
        });

        return content;
    }
}

class PortfolioLoader {
    constructor() {
        // Fixed: match property name (requestHeader)
        this.requestHeader = new Headers({'Accept': 'text'});
        this.parser = new CSVParser();
        this._cell = []
        this._tags = []
        this._rawCert =  []
        this._rawEdu = []
        this._rawService = []
        this._award = []
        this._project = []
        this._rawPosition = []
        this._posBullets = []
    }

    async #init() {
        // Downloads and populates rawdata caches asynchronously
        this._cell = await d3.json('./data/cells.json');
        this._tags = await d3.json('./data/tags.json');

        // Fetch as raw text and parse rows manually
        this._rawCert = await this.#fetchAndParseCSV('./data/certification.csv');
        this._rawEdu = await this.#fetchAndParseCSV('./data/education.csv');

        // Fixed: changed leading slash to relative path for consistency './data/...'
        this._rawService = await this.#fetchAndParseCSV('./data/professional_service.csv');

        this._rawPosition = await this.#fetchAndParseCSV('./data/position.csv');
        this._posBullets = await this.#fetchAndParseCSV('./data/position_bullet.csv');
        this._award = await this.#fetchAndParseCSV('./data/professional_award.csv');
        this._project = await this.#fetchAndParseCSV('./data/projects.csv');
    }

    async #fetchAndParseCSV(url) {
        const request = new Request(url);

        // Fixed: use this.requestHeader instead of undefined this.reqHeader
        const response = await fetch(request, { headers: this.requestHeader });

        if (!response.ok) {
            console.log(`HTTP error! Status: ${response.status} for URL: ${url}`);
            return [];
        }
        const text = await response.text();
        return this.parser.parse(text)

      }

      async LoadAll() {
        // Fixed: added parentheses () so the async method actually executes
        await this.#init();
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

const portfolioData = new PortfolioLoader();
window.portfolioData = portfolioData;

/*
const config = new Sanitizer({
  attributes: ['class', 'role', 'aria-label']
});
*/

// DOM elements
const tooltip = document.getElementById('floating-tooltip');
const tagFilterSelect = document.getElementById('tag-filter');
const resetBtn = document.getElementById('reset-filters');


const dateFormat = new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric' })
function formatDate(date) {
  return dateFormat.format(date)
}

function displayTags(tags) {
    const allTags = window.portfolioData.tags;
    let tagList = document.createElement('dl')
    tagList.className = 'tag-chips'
    tagList.ariaLabel = 'Tags'
    tagList.role = 'list'
    tags.split(',').map (t => {
      // Use .find() instead of .filter() to get the single object directly
      const tag = allTags.find(t1 => t1.slug === t.trim());
      const item = document.createElement('dt')
      item.ariaLabel = 'Tag'
      item.role = 'group'
      item.textContent = t.trim()

      const desc = document.createElement('dd')
      // Add a fallback case in case the tag slug isn't found in portfolioData
      if (tag) {
        item.classList = ['tag-chips', t.trim()]
        desc.textContent = tag.category
        desc.classList = ['tag-chips', t.trim()]
      }
      else {
        item.classList = ['tag-chips', 'flash-error']
        desc.classList = ['tag-chips', 'flash-error']
        desc.textContent = null;
      }

      item.appendChild(desc)

      tagList.appendChild(item)

    })
    return tagList;
}

async function createSections(key)  {
    let page = document.getElementById(key)
    page.class = 'card-grid'
    switch (key) {
        case 'position':
            const postSummary = window.portfolioData.rawPosition
            if(!postSummary) {
              console.warn("Position data not loaded")
              break;
            }
            const posBullets = window.portfolioData.rawPosBullets
            postSummary.reverse()
            postSummary.map(p => {
            let card = document.createElement('article')
            card.className = 'art-sect'
            card.role = 'feed';
            let title = document.createElement('h3')
            title.className = 'art-sect'
           title.textContent = p.title
            let sm = document.createElement('p')
            sm.classNames = ['art-sect', 'org']
            sm.textContent= p.org_name
            let dates = document.createElement('p')
            dates.className = 'art-sect'
            dates.textContent = `${formatDate(p.start_date)} - ${formatDate(p.end_date)}`
            let tasks = document.createElement('dl')
            tasks.className = 'art-sect'
            tasks.ariaLabel = 'Major Tasks'
            let label = document.createElement('dt')
            label.className = 'art-sect'
            label.textContent = 'Major Tasks'
            posBullets.filter(
                        b => b.bullet_tag.includes(p.bullet_tag))
                        .map(b => {
                          let bullet = document.createElement('dd');
                          bullet.textContent =  b.bullet_text
                          label.appendChild(bullet)
              })
            tasks.appendChild(label)

            card.appendChild(title)
            card.appendChild(sm)
            card.appendChild(dates)
            card.appendChild(displayTags(p.tags))
            card.appendChild(tasks)

            page.appendChild(card)
            });
            break;
        case 'cert':
            const certs = window.portfolioData.rawCert;
            if (!certs) {
                console.warn("Certs data not loaded yet.");
                break;
            }
         certs.reverse()
          certs.map(c => {
             let card = document.createElement('article')
            card.className = 'art-sect'
            card.role = 'feed';
            let title = document.createElement('h3')
            title.className = 'art-sect'
           title.textContent = c.cert_name
            let sm = document.createElement('p')
            sm.classList = ['art-sect', 'org']
            sm.textContent= c.gov_body
            let dates = document.createElement('p')
            dates.className = 'art-sect'
            dates.textContent = formatDate(c.earn_date)

            card.appendChild(title)
            card.appendChild(sm)
            card.appendChild(dates)
            card.appendChild(displayTags(c.tag_slugs))

            page.appendChild(card)
          })
            break;
        case 'edu':
            const ed = window.portfolioData.rawEdu
            if (!ed) {
            console.warn("Awards data not loaded yet.");
            break;
           }
           ed.map(e => {
              let card = document.createElement('article')
            card.className = 'art-sect'
            card.role = 'feed';
            let title = document.createElement('h3')
            title.className = 'art-sect'
           title.textContent = e.degree
           let scholarship = document.createElement('p')
           scholarship.classList = ['art-sect', 'org']
           scholarship.textContent = e.scholarship
            let sm = document.createElement('p')
            sm.classList = ['art-sect', 'org']
            sm.textContent= e.school
            let capition = document.createElement('p')
            capition.className = 'art-sect'
            capition.textContent = e.caption

            card.appendChild(title)
            card.appendChild(scholarship)
            card.appendChild(sm)
            card.appendChild(displayTags(e.tag_slugs))
            card.appendChild(capition)

            page.appendChild(card)
           })
            break;
    case 'award':
    const awards = window.portfolioData.rawAward;
    awards.reverse();
    // Safety check: ensure data is loaded before trying to map
    if (!awards) {
        console.warn("Awards data not loaded yet.");
        break;
    }
     awards.map(a => {
            let card = document.createElement('article')
            card.className = 'art-sect'
            card.role = 'feed';
            let title = document.createElement('h3')
            title.className = 'art-sect'
           title.textContent = a.title
            let sm = document.createElement('p')
            sm.classList = ['art-sect', 'org']
            sm.textContent= a.org_name
            card.appendChild(title)
            card.appendChild(displayTags(a.tag_slug))
            card.appendChild(sm)
            page.appendChild(card)
        });
      break;
        case 'service':
            const services = window.portfolioData.rawService
              if(!services) {
              console.warn("Service data not loaded")
              break;
            }
            services.reverse()
            services.map(s => {
            let card = document.createElement('article')
            card.className = 'art-sect'
            card.role = 'feed';
            let title = document.createElement('h3')
            title.className = 'art-sect'
           title.textContent = s.title
            let sm = document.createElement('p')
            sm.classList = ['art-sect', 'org']
            sm.textContent = s.org_name

            let dates = document.createElement('p')
            dates.className = 'art-sect'
            dates.textContent = s.end_date ? `${formatDate(s.start_date)} - ${formatDate(s.end_date)}`  : formatDate(s.start_date)

            card.appendChild(title)
            card.appendChild(sm)
            card.appendChild(displayTags(s.tag_slugs))
            card.appendChild(dates)

            page.appendChild(card)
            });
            break;
        case 'project':
            const projects = window.portfolioData.rawProject;
                     if(!projects) {
              console.warn("Position data not loaded")
              break;
            }
            projects.reverse()
            projects.map(p => {
            let card = document.createElement('article')
            card.className = 'art-sect'
            card.role = 'feed';
            let title = document.createElement('h3')
            title.className = 'art-sect'
            title.textContent = p.name
           if(p.repo_url) {
            let link = document.createElement('a')
            link.target = "_blank"
            link.href = p.repo_url
            link.textContent = p.title
            title.appendChild(link)
           } else {
            title.textContent = p.title
           }
            let sm = document.createElement('samp')
            sm.className = 'art-sect'
            sm.textContent = p.description

            card.appendChild(title)
            card.appendChild(displayTags(p.tags))
            card.appendChild(sm)

            if (p.deploy_url) {
               let smDeploy = document.createElement('p')
                sm.className = 'art-sect'
                let depLink  = document.createElement('a')
                depLink.target = "_blank"
                depLink.href = p.deploy_url
                depLink.textContent ='Live demo'
                smDeploy.appendChild(depLink)
                card.appendChild(smDeploy)
            }

            page.appendChild(card)
            });
            break;
        default:
            return;
    }
    return key;
}

async function createBody() {
    const sections = ['position', 'cert', 'service', 'award', 'edu', 'project'];

    const result = await Promise.allSettled(
        sections.map(async (s) => {
            try {
                const res = await createSections(s);
                return res;
            } catch (err) {
                console.error(`Error in section [${s}]:`, err);
                throw err; // Ensures allSettled catches it properly
            }
        })
    );

    // Optional: Log overall results to see what passed/failed
    console.log("All sections settled:", result);
    return result;
}

function initFilters() {
      const allTags = window.portfolioData.tags;
    const categories = [...new Set(allTags.map(t => t.category))];
    categories.forEach(cat => {
        const optGroup = document.createElement('optgroup');
        optGroup.label = cat.toUpperCase().replace('-', ' ')
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
    if (container.childNodes) {
      container.replaceChildren()
    }
    const width = parent.clientWidth || 600;
    const height = parent.clientHeight || 350;
    const margin = { top: 20, right: 30, bottom: 40, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    container.setAttribute("height", innerHeight)
    container.setAttribute("width", innerWidth)
  container.setAttribute("role", 'presentation')
  container.setAttribute("viewbox", [0, 0, innerWidth, innerHeight])
   container.setAttribute("ariaLabel", "Marey's Train Schedule style showing cross-systems experience and expertise.")

    // Extract unique X and Y sets
        const xValues = [...new Set(filteredCells.x)].sort();
        const yValues = [...new Set(filteredCells.y)].sort();
        const cats = [... new Set(filteredCells.category)].sort()


        const xScale =  d3.scaleOrdinal(xValues)
        .domain(cats)
        const yScale =  d3.scaleOrdinal(yValues)
        .domain(cats)


        const catScale = d3.scalePoint()
        .domain(cats)

        // Axes
function xAxis(g) {
    g.selectAll("g")
        .attr("transform", `translate(0,${margin.height - margin.bottom})`)
        .data(filteredCells)
        .call(g => g.append("line")
            .attr("class", d => d.x)
            .attr('stroke-width', '3')
            .attr('stroke-opacity', '0.7')
            .call(g => g.append("text")
                .attr("x", 12)
                .attr("dy", "0.35em")
            )
        )
        .append('g')
        .call(g => g.append("line")
            .attr("class", d => d.y)
            .attr('stroke-width', '3')
            .attr('stroke-opacity', '0.7')
            .attr("transform", `translate(0,${margin.height - margin.bottom})`)
            .call(g => g.append("text")
                .attr("x", -12)
                .attr("dy", "0.35em")
            )
        )
        .call(d3.axisLeft(xScale).tickValues(xValues))
        .call(d3.axisRight(yScale).tickValues(yValues));
}

function yAxis(g) {
    g.call(d3.axisTop(catScale).tickValues(cats));
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
    .attr("preserveAspectRatio", "none")
    .attr('role', 'presentation')
    .attr('opacity', 1)
    .attr('aria-label', "Marey's Train Schedule style showing cross-systems experience and expertise.")
    .call(xAxis)
    .call(yAxis);

const routes = svgBase.append('g')
    .selectAll("g")
    .data(filteredCells)
    .enter()
    .append('g');

// First path (Line 2)
routes.append("path")
    .call(line2)
    .attr("class", d => `has-tooltip ${d.y}`)
    .attr("data-tooltip", d => d.x != d.y ? `Intersection of ${d.x} and ${d.y} with weight count ${d.count}` : `Count of ${d.y} is ${d.count}`)
    .attr("text", d => d.x != d.y ? `Intersection of ${d.x} and ${d.y} with weight count ${d.count}` : `Count of ${d.y} is ${d.count}`);

// Second path (Line 1)
routes.append("path")
    .call(line)
    .attr("class", d => `has-tooltip ${d.y}`)
    .attr("data-tooltip", d => d.x != d.y ? `Intersection of ${d.x} and ${d.y} with weight count ${d.count}` : `Count of ${d.x} is ${d.count}`)
    .attr("text", d => d.x != d.y ? `Intersection of ${d.x} and ${d.y} with weight count ${d.count}` : `Count of ${d.x} is ${d.count}`);

// Circles with bound data and class set to d.x
routes.append("g")
    .selectAll("circle")
    .data(d => [d]) // Bind the parent row datum to the circle selection
    .enter()
    .append("circle")
    .attr("class", d => `has-tooltip ${d.x}`)
    .attr('stroke-width', '3')
    .attr('stroke-opacity', '.7')
    .attr("data-tooltip", d => d.x != d.y ? `Intersection of ${d.x} and ${d.y} with weight count ${d.count}` : `Count of ${d.y} is ${d.count}`)
    .attr("r", d => Math.max(6, Math.min(18, Math.sqrt(d.count) * 4)))
    .attr('cx', v => xScale(xValues.indexOf(v.x)))
    .attr('cy', v => yScale(yValues.indexOf(v.y)));
}

        // --- 2. Cascaded d3.treemap Visualization ---
function renderTreemap(filteredCells) {
  let container  =document.getElementById('treemap-container');
    const width = document.clientWidth || 400;
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


    const xValues = [...new Set(filteredCells.x)].sort();
    const yValues = [...new Set(filteredCells.y)].sort();
    const vals = [... new Set(xValues, yValues)]
     const cats = [... new Set(filteredCells.category)].sort()
    // Build hierarchical data structure from tags and cells


const data = vals.map(v => {
  return {
        "name" : v,
        "children": filteredCells.filter(c => (c.y == v || c.x == v)),
    }})



function treemap(data) {
     return  d3.treemap()
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
      .call(treemap, data)
      .attr('style', null)
      .append("filter")
    .append("feDropShadow")
      .attr("flood-opacity", 0.3)
      .attr("dx", 0)
      .attr("stdDeviation", 3)



       const node = svgBase.selectAll("g")
        .data(d3.group(data, d => d.name))
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
        const allCells = window.portfolioData.cells;
        if (selectedSlug !== 'all') {
            let filteredCells = allCells.filter(c => c.x === selectedSlug || c.y === selectedSlug)
            if (filteredCells.length != 0) {
             renderMareyChart(filteredCells);
           //  renderTreemap(filteredCells);
           }
       } else if (selectedSlug === 'all') {
        renderMareyChart(allCells);
        //renderTreemap(allCells);
    }
}

function filterNodeMap(filteredCells) {
    const nodeMap = new Map(Array.from(window.portfolioData.nodeMap));
    const allSlugs = Array.from(new Set(filteredCells.x, filteredCells.y))
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
  return 0
}

function AddHeroTags() {
  const parent = document.getElementById('focus-areas')
  const tags = ["AI Safety", "Security Engineering", " Cloud and Industrial DevSecAIOps", "Distributed Systems", "Federated and Edge AI", "Post-Quantum Readiness"]
  tags.map((t, num) => {
    const li = document.createElement('li');
  li.className = 'hero-tags';
  li.style.setProperty('--i', num);
  li.textContent = t
  parent.appendChild(li)
  });
}

tagFilterSelect.addEventListener('change', (e) => {
            updateVisualizations(e.target.value);
});

resetBtn.addEventListener('click', () => {
            tagFilterSelect.value = 'all';
            updateVisualizations('all');
});


window.addEventListener('DOMContentLoaded', async () => {
    try {
        AddHeroTags()
        await window.portfolioData.LoadAll()
        updateVisualizations('all');
        await createBody();
        initFilters()
        AddTooltips()
    } catch (err) {
        console.log("error", err);
    }
});

// Responsive resize listener
window.addEventListener('resize', () => {
    updateVisualizations(tagFilterSelect.value);
})
