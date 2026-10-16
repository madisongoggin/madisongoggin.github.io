
 /**
* Secure Portfolio Visualization Module
* Handles data parsing, state management, v7 chart rendering, accessibility attributes, and interactivity.
*/


import { select, autoType, rollup, InternSet, scalePoint, hierarchy, treemap, csv, formatSpecifier, utcFormat, utcParse } from './d3.v7.min.js'

const tagClean = (t) => t.tag_slugs.split(',').map(t => t.trim())


formatSpecifier(utcParse("%Y-%m-%d"))
formatSpecifier(utcFormat("%b %Y"))

// Validate and sanitize incoming data structure
const portfolioData = async() => {
    const cells = autoType(await json('./data/cells.json'))
    const tags = autoType(await json('./data/tags.json'))
    const rawCert = d.autoType(await csv('./data/certification.csv'))
    const cert =  rollup(rawCert, tagClean)
    const rawEdu = autoType(await csv('./education.csv'))
    const edu = rollup(rawEdu, tagClean)
    const rawPosition = autoType(await  csv('./position.csv'))
    const position = rollup(rawPosition, tagClean)
    const rawPosBullets = autoType(await csv('./position_bullet.csv'))
    const posBullets = rollup(rawPosBullets, tagClean)
    const rawAwards = autoType(await csv('./professional_award.csv'))
    const awards =  rollup(rawAwards)
    const rawService = autoType(await csv('./professional_service.csv'))
    const service = rollup(rawService, tagClean)
    const rawProject = autoType(await csv('./project.csv'))
    const projects = rollup(rawProject, tagClean)
    const nodeMap = new InternSet(merge(cert, edu, position, posBullets, awards, service, projects))
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
            reverse(postSummary)
            card = card.concat(
                 postSummary.map(p => {
                `<li class = "simple-item">
                 <article class="card">
                    <header>
                    <h3>${p.title}</h3>
                    <p class="card-org">${p.org}</p>
                    <p class="card-meta">${p.period}</p>
                    </header>` +
                    displayTags(p.tag_slugs) +
                    `<ul class="bullets">` +
                    sort(
                        filter(posBullets, (b) => b.bullet_tag === p.bullet_tag),
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
            reverse(certs)
            card = card.concat(certs.map(c =>  `<li class = "simple-item"> <article class="card">
                    <header>
                    <h3>${c.name}</h3>` +
                    displayTags(c.tag_slugs) +
                    `</header>
                    <p>${c.body}</p>` +
                    c.date ? `<p>${c.date}</p>` : `` +
                    `</article>`
            ), `</ul>`)
        break;
        case 'edu':
            const ed =  portfolioData.rawEdu
            card = card.concat(ed.map(e =>  `<li class = "simple-item"><article class="card">
                    <header>
                    <h3>${e.degree}</h3>` +
                    e.scholarship ? `<p class='card-org'>${e.scholarship}</p>` : `` +
                    displayTags(e.tag_slugs)
                    `</header>
                     <p class='card-meta'>${e.school}</p>` +
                     e.caption ? `<p>${e.caption}</p>` : `` +
                    `</article>`
                ), `</ul>`)
        break;
        case 'award':
            const awards =  portfolioData.rawAward
            reverse(awards)
            card = card.concat(
            awards.map(a =>  `<li class = "simple-item"><article class="card">
                    <header>
                    <h3>${a.title}</h3>` +
                    displayTags(a.tag_slugs) +
                    `</header>
                    <p>${a.org}</p>
                    </article>`
          ), `</ul>`)
          break;
        case 'service':
            const services = portfolioData.rawService;
            reverse(services)
            card = card.concat(
            services.map(s => `<li class = "simple-item"><article class="card">
                    <header>
                    <h3>${s.title}</h3>
                    <p class="card-org"${s.org}</p>` +
                    displayTags(s.tag_slugs) +
                    `</header>
                    <p class='card-meta'>${s.start} - ${s.end}</p>
                    </article>`
            ), `</ul>`)
        break;
        case 'project':
            const projects = portfolioData.rawProjects;
            reverse(projects)
            card = card.concat(
            projects.map(p =>
                `<li class = "simple-item"> <article class="card">
                    <header>
                        <h3>` +
                        p.repo_url ? `<a target="_blank" href="${p.repo_url}">${p.name}</a>` : -p.name
                    `</h3>` +
                        p.status ? `<p class="card-meta">${p.status }}</p>` : ``  +
                        displayTags(p.tag_slugs) +
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
        const xValues = [...new Set(filteredCells.cells.map(d => d.x))].sort();
        const yValues = [...new Set(filteredCells.cells.map(d => d.y))].sort();

        const xScale = scalePoint()
                .domain(xValues)
                .range([0, innerWidth])
                .padding(0.5);

        const yScale = scalePoint()
                .domain(yValues)
                .range([innerHeight, 0])
                .padding(0.5);

        // Axes
        g.append('g')
                .attr('transform', `translate(0,${innerHeight})`)
                .call(axisBottom(xScale))
                .selectAll('text')
                .attr('class', 'text-xs text-slate-600')
                .style('text-anchor', 'middle');

        g.append('g')
                .call(axisLeft(yScale))
                .selectAll('text')
                .attr('class', 'text-xs text-slate-600');

        // Grid lines
        g.append('g')
                .attr('class', 'grid opacity-15')
                .call(axisLeft(yScale).tickSize(-innerWidth).tickFormat(''));

        // Draw train tracks / connection paths for items sharing objects
            const lineGen = line()
                .x(d => xScale(d.x))
                .y(d => yScale(d.y))
                .curve(curveMonotoneX);

        // Group cells by shared objects or categories to form "train routes"
        filteredCells.Array.forEach(c => {
                        g.append('path')
                        .datum(nodeMap.get(c))
                        .attr('fill', 'none')
                        .attr('stroke', c.color)
                        .attr('stroke-width', 3)
                        .attr('stroke-opacity', 0.4)
                        .attr('d', lineGen)

        });

            // Draw data points (Trains/Projects)
            const nodes = g.selectAll('.train-node')
                .data(filteredCells, d => `${d.x}-${d.y}-${d.name || d.count}`);

            const nodeEnter = nodes.enter()
                .append('g')
                .attr('class', 'train-node cursor-pointer group')
                .attr('transform', d => `translate(${xScale(d.x) || 0},${yScale(d.y) || 0})`)
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

        // --- 2. Cascaded Treemap Visualization ---
function renderTreemap(filteredCells, nodeMap) {
    const container = document.getElementById('treemap-container');
    container.innerHTML = '';

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 350;

    const svg = select('#treemap-container')
                .append('svg')
                .attr('width', width)
                .attr('height', height)
                .attr('viewBox', [0, 0, width, height])
                .attr('role', 'img')
                .attr('aria-label', 'Cascaded treemap representing hierarchical categories of skills and weights.');

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

    const root = hierarchy(hierarchicalData)
                .sort((a, b) => b.count - b.count);

    treemap()
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
