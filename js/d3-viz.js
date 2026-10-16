
 /**
* Secure Portfolio Visualization Module
* Handles data parsing, state management, v7 chart rendering, accessibility attributes, and interactivity.
*/


const tagClean = (t) = t.split(',').map(t => t.trim())
const formatDate = d3.timeFormat("%b %Y");
// Validate and sanitize incoming data structure
const portfolioData = async() => {
    const cells = d3.autoType(await d3.json('./data/cells.json'))
    const tags = d3.autoType(await d3.json('./data/tags.json'))
    const rawCert = d3.autoType(await d3.csv('./data/certification.csv'))
    const cert =  d3.rollup(rawCert, t => tagClean(t.tag_slugs))
    const rawEdu = d3.autoType(await d3.csv('./education.csv'))
    const edu = d3.rollup(rawEdu, t => tagClean(t.tag_slugs))
    const rawPosition = d3.autoType(await  d3.csv('./position.csv'))
    const position = d3.rollup(rawPosition, t => tagClean(t.tags))
    const posBullets = d3.autoType(await d3.csv('./position_bullet.csv'))
    const rawAwards = d3.autoType(await d3.csv('./professional_award.csv'))
    const awards =  d3.rollup(rawAward,  t => tagClean(t.tag_slug))
    const rawService = d3.autoType(await d3.csv('./professional_service.csv'))
    const service = d3.rollup(rawService,  t => tagClean(t.tag_slugs))
    const rawProject = d3.autoType(await d3.csv('./projects.csv'))
    const projects = d3.rollup(rawProject, t => tagClean(t.tags))
    const nodeMap = new d3.InternSet(d3.merge(cert, edu, position, posBullets, awards, service, projects))
};

// DOM elements
const tooltip = document.getElementById('floating-tooltip');
const tagFilterSelect = document.getElementById('tag-filter');
const resetBtn = document.getElementById('reset-filters');

function displayTags(tags) {
    const allTags = portfolioData.tags;
    return `<ul class="tag-chips" aria-label="Tags">` +
    tags.map(t =>  {
        let tag = filter(allTags, t1 => t1.slug === t)
        `<li class="tag-chip" style="--chip: "${tag.color}">${tag.name}</li>`
    }) + `</ul>`
}

const createSections = (key) => {
    card = `<section class="credential-block panel" aria-labelledby="${key}">
    <h2>${key}</h2>
    <ul class="simple-list">
    `
    switch (key) {
        case 'position':
            const postSummary = portfolioData.rawPosition
            const posBullets = portfolioData.rawPosBullets
            d3.reverse(postSummary)
            card = card.concat(
                 postSummary.map(p => {
                `<li class = "simple-item">
                 <article class="card">
                    <header>
                    <h3>${p.title}</h3>
                    <p class="card-org">${p.org}</p>
                    <p class="card-meta">`formatDate(p.start_date} + ' -'  + fomatDate(p.end_Date) + `</p>
                    </header>` +
                    displayTags(p.tags) +
                    `<ul class="bullets">` +
                    d3.sort(
                        d3.filter(posBullets, (b) => b.bullet_tag === p.bullet_tag),
                        (b) => b.bullet_num
                    )
                    .map(b =>
                        `<li>${b.bullet_text}</li>`
                    )
                    + '</ul><`/article>'
                }
            ), `</ul>`)
        break;
        case 'cert':
            const certs = portfolioData.rawCert;
            d3.reverse(certs)
            card = card.concat(certs.map(c =>  `<li class = "simple-item"> <article class="card">
                    <header>
                    <h3>${c.cert_name}</h3>` +
                    displayTags(c.tag_slugs) +
                    `</header>
                    <p class='tag-org">${c.gov_body}</p>` +
                    c.earn_date ? `<p>`formatDate(c.earn_date) +` </p>` : `` +
                    `</article>`
            ), `</ul>`)
        break;
        case 'edu':
            const ed =  portfolioData.rawEdu
            card = card.concat(ed.map(e =>  `<li class = "simple-item"><article class="card">
                    <header>
                    <h3>${e.degree}</h3>` +
                    e.scholarship ? `<p class='card-org'>${e.scholarship}</p>` : `` +
                    displayTags(e.tag_slugs) + 
                    `</header>
                     <p class='card-meta'>${e.school}</p>` +
                     e.capiton ? `<p>${e.capiton}</p>` : `` +
                    `</article>`
                ), `</ul>`)
        break;
        case 'award':
            const awards =  portfolioData.rawAward
            d3.reverse(awards)
            card = card.concat(
            awards.map(a =>  `<li class = "simple-item"><article class="card">
                    <header>
                    <h3>${a.title}</h3>` +
                    displayTags(a.tag_slugs) +
                    `</header>
                    <p class="card-org">${a.org_name}</p>
                    </article>`
          ), `</ul>`)
          break;
        case 'service':
            const services = portfolioData.rawService;
            d3.reverse(services)
            card = card.concat(
            services.map(s => `<li class = "simple-item"><article class="card">
                    <header>
                    <h3>${s.title}</h3>
                    <p class="card-org"${s.org_name}</p>` +
                    displayTags(s.tag_slugs) +
                    `</header>
                    <p class='card-meta'>` + 
                 formatDate(s.start_date) + 
             s.end_date ? ' -' + formatDate(s.end_date) : '' +
                    `</p>
                    </article>`
            ), `</ul>`)
        break;
        case 'project':
            const projects = portfolioData.rawProjects;
            d3.reverse(projects)
            card = card.concat(
            projects.map(p =>
                `<li class = "simple-item"> <article class="card">
                    <header>
                        <h3>` +
                        p.repo_url ? `<a target="_blank" href="${p.repo_url}">${p.name}</a>` : -p.name
                    `</h3>` +
                        p.status ? `<p class="card-meta">${p.status }}</p>` : ``  +
                        displayTags(p.tags) +
                `</header>
                <p>${p.description}</p>` +
                   p.deploy_url ? `<p class="card-links"><a target="_blank" href=${p.deploy_url}">Live demo</a></p>` : ``
               + `</article>`
            ), `</ul>`)
            break;
        default:
            return;
    }
    card.concat(`</section>`)
    return card;
}

const createBody = () => {
    const start = document.getElementById('viz')
    const sections = [position, service, awards, edu, project]
    const body = sections.map(s => createSections(s))
    start.append(body)
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

    const svg = select('#marey-container')
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .attr('viewBox', [0, 0, width, height])
            .attr('role', 'img')
            .attr('aria-label', "Marey's schedule timeline showing project milestones across time and stages.");
    const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

    // Extract unique X and Y sets
        const xValues = [...new Set(filteredCells.map(d => d.x))].sort();
        const yValues = [...new Set(filteredCells.map(d => d.y))].sort();

        let scaleFactor = innerWidth / xValues.length
        const xScale =  Array.from(xValues, (e, i) => { (i + 1)  * scaleFactor})
        scaleFactor = innerWidth / yValues.length
        const yScale =  Array.from(yValues, (e, i) => { (i + 1)  * scaleFactor})                       

        // Axes
        g.append('g')
                .attr('transform', `translate(0,${innerHeight})`)
                .call(d3.axisBottom(xScale))
                .selectAll('text')
                .attr('class', 'text-xs text-slate-600')
                .style('text-anchor', 'middle');

        g.append('g')
                .call(d3.axisLeft(yScale))
                .selectAll('text')
                .attr('class', 'text-xs text-slate-600');

        // Grid lines
        g.append('g')
                .attr('class', 'grid opacity-15')
                .call(d3.axisLeft(yScale).tickSize(-innerWidth).tickFormat(''));

        // Draw train tracks / connection paths for items sharing objects
         const lineGen = d3.line(xScale).curveMonotoneX()

        const allTags = performanceData.tags;

        // Group cells by shared objects or categories to form "train routes"
        for(let i = 0; i < xScale.length; i++) {
                   g.append('path')
                     .datum(filteredCells.get(xValues[i]))
                      .attr('fill', 'none')
                      .attr('stroke', allTags.filter(t => t.slug == xValues[i]).map(t => t.color))
                       .attr('stroke-width', 3)
                      .attr('stroke-opacity', 0.4)
                       .attr('d', xScale[i])

        }
         // Draw data points (Trains/Projects)
            const nodes = g.selectAll('.train-node')
                .data(filteredCells, d => `${d.x}-${d.y}-${d.count}`);

            const nodeEnter = nodes.enter()
                .append('g')
                .attr('class', 'train-node cursor-pointer group')
                .attr('tabindex', '0')
                .attr('role', 'button')
                .attr('aria-label', d => `Intersection of ${d.x} and ${d.y} with weight count ${d.count}`);

            nodeEnter.append('circle')
                .attr('r', d => Math.max(6, Math.min(18, Math.sqrt(d.count) * 4)))
                .attr('fill', d => d.color || '#3b82f6')
                .attr('stroke', '#ffffff')
                .attr('stroke-width', 2)
                .attr('class', 'transition-transform duration-200 group-hover:scale-125');

            nodeEnter.on('mouseenter', (event, d) => {
                showTooltip(`Intersection of ${d.x} and ${d.y} with weight count ${d.count}`);
            })
            .on('mousemove', updateTooltipPosition)
            .on('mouseleave', hideTooltip)
            .on('focus', (event, d) => {
                  showTooltip(`Intersection of ${d.x} and ${d.y} with weight count ${d.count}`);
            })
            .on('blur', hideTooltip);
        }

        // --- 2. Cascaded d3.treemap Visualization ---
function renderTreemap(filteredCells, nodeMap) {
    const container = document.getElementById('d3.treemap-container');
    container.innerHTML = '';

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 350;

    const svg = select('#d3.treemap-container')
                .append('svg')
                .attr('width', width)
                .attr('height', height)
                .attr('viewBox', [0, 0, width, height])
                .attr('role', 'img')
                .attr('aria-label', 'Cascaded d3.treemap representing hierarchical categories of skills and weights.');

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

    const leaf = svg.selectAll('g')
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
    }


// --- Interactivity & Event Handling ---
function updateVisualizations(selectedSlug) {
        const allCells = portfolioData.cells;
        if (selectedSlug && selectedSlug !== 'all') {
            let filteredCells = allCells.filter(c => c.x === selectedSlug || c.y === selectedSlug)
            if (filteredCells.length === 0) {
                    filteredCells = allCells; // Fallback if no direct match
            }
        }
        renderMareyChart(filteredCells, filterNodeMap(filteredCells));
        renderTreemap(filteredCells, filterNodeMap(filteredCells));
}

function filterNodeMap(filteredCells) {
    const nodeMap = portfolioData.nodeMap;
    const allSlugs = new Set(filteredCells.map(c => c.x), filteredCells.map(c => c.y))
    allSlugs.map(s => {
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

// Initialize on load
 window.addEventListener('DOMContentLoaded', () => {
    initFilters();
    updateVisualizations('all');
});

// Responsive resize listener
window.addEventListener('resize', () => {
    updateVisualizations(tagFilterSelect.value);
})
