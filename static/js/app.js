// Global variables
let orgChartData = { entities: [], ownership: [], persons: [] };
let currentFieldMappings = {};
let uploadBarCollapsed = false;
let focusedEntityId = null; // Track the currently focused entity
let isShowingFocusedView = false; // Track if we're in focused mode

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeFileUploads();
    initializeControls();
    loadOrgChartData();
    updateUploadProgress();
});

// File upload initialization
function initializeFileUploads() {
    const fileInputs = document.querySelectorAll('input[type="file"]');
    
    fileInputs.forEach(input => {
        input.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const dataset = this.id.replace('file-', '');
                uploadFile(dataset, file);
            }
        });
    });
}

// Upload file and get field mapping
async function uploadFile(dataset, file) {
    showLoading(true);
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch(`/upload/${dataset}`, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            showFieldMapping(dataset, result.incoming_fields, result.standard_fields);
        } else {
            showError(result.error);
        }
    } catch (error) {
        showError('Upload failed: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Show field mapping interface
function showFieldMapping(dataset, incomingFields, standardFields) {
    const uploadStep = document.querySelector(`[data-dataset="${dataset}"]`);
    const uploadSection = uploadStep.querySelector('.upload-section');
    const mappingSection = uploadStep.querySelector('.mapping-section');
    const mappingContainer = document.getElementById(`mapping-${dataset}`);
    
    // Hide upload section, show mapping section
    uploadSection.classList.add('hidden');
    mappingSection.classList.remove('hidden');
    
    // Create field mapping UI
    let mappingHTML = '<div class="text-sm font-medium text-gray-700 mb-2">Map your fields:</div>';
    
    standardFields.forEach(standardField => {
        mappingHTML += `
            <div class="flex items-center space-x-2 mb-2">
                <span class="text-xs font-medium text-gray-600 w-20">${standardField}:</span>
                <select name="${standardField}" class="field-mapping flex-1 text-xs border border-gray-300 rounded px-2 py-1">
                    <option value="">Select field...</option>
                    ${incomingFields.map(field => `<option value="${field}">${field}</option>`).join('')}
                </select>
            </div>
        `;
    });
    
    mappingContainer.innerHTML = mappingHTML;
    
    // Store current mappings
    currentFieldMappings[dataset] = { standardFields, incomingFields };
}

// Submit field mapping
async function submitMapping(dataset) {
    showLoading(true);
    
    const mappingSelects = document.querySelectorAll(`#mapping-${dataset} select`);
    const mapping = {};
    
    mappingSelects.forEach(select => {
        if (select.value) {
            mapping[select.name] = select.value;  // standard_field: incoming_field
        }
    });
    
    if (Object.keys(mapping).length === 0) {
        showError('Please map at least one field');
        showLoading(false);
        return;
    }
    
    try {
        const response = await fetch(`/map-fields/${dataset}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ mapping })
        });
        
        const result = await response.json();
        
        if (result.success) {
            markStepComplete(dataset);
            showSuccess(result.message);
            await loadOrgChartData();
            updateUploadProgress();
            checkAutoCollapse();
        } else {
            showError(result.error);
        }
    } catch (error) {
        showError('Processing failed: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Mark upload step as complete
function markStepComplete(dataset) {
    const uploadStep = document.querySelector(`[data-dataset="${dataset}"]`);
    const container = uploadStep.querySelector('.border');
    const icon = uploadStep.querySelector('i.fa-circle, i.fa-check-circle');
    
    container.classList.add('bg-green-50', 'border-green-200');
    icon.className = 'fas fa-check-circle text-green-500';
    
    // Replace content with success message
    const mappingSection = uploadStep.querySelector('.mapping-section');
    mappingSection.innerHTML = `
        <div class="text-sm text-green-600">
            <i class="fas fa-check mr-1"></i>Successfully uploaded and processed
        </div>
    `;
}

// Update upload progress counter
function updateUploadProgress() {
    const completedSteps = document.querySelectorAll('.fa-check-circle').length;
    document.getElementById('completedCount').textContent = completedSteps;
}

// Auto-collapse upload bar when all uploads complete
function checkAutoCollapse() {
    const completedSteps = document.querySelectorAll('.fa-check-circle').length;
    if (completedSteps === 3 && !uploadBarCollapsed) {
        setTimeout(() => {
            toggleUploadBar();
        }, 2000);
    }
}

// Toggle upload bar collapse
function toggleUploadBar() {
    const uploadBar = document.getElementById('uploadBar');
    const uploadSteps = document.getElementById('uploadSteps');
    const collapseBtn = document.getElementById('collapseBtn');
    const icon = collapseBtn.querySelector('i');
    
    uploadBarCollapsed = !uploadBarCollapsed;
    
    if (uploadBarCollapsed) {
        uploadSteps.classList.add('hidden');
        uploadBar.classList.add('py-2');
        uploadBar.classList.remove('py-4');
        icon.className = 'fas fa-chevron-up';
    } else {
        uploadSteps.classList.remove('hidden');
        uploadBar.classList.remove('py-2');
        uploadBar.classList.add('py-4');
        icon.className = 'fas fa-chevron-down';
    }
}

// Initialize chart controls
function initializeControls() {
    // Focus functionality
    document.getElementById('entityFocus').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            focusOnEntity();
        }
    });
    
    // Search functionality
    document.getElementById('entitySearch').addEventListener('input', filterChart);
    document.getElementById('jurisdictionFilter').addEventListener('change', filterChart);
    document.getElementById('ownershipThreshold').addEventListener('input', function() {
        document.getElementById('thresholdValue').textContent = this.value + '%';
        filterChart();
    });
    
    // Display options
    document.getElementById('showPersons').addEventListener('change', updateChartDisplay);
    document.getElementById('showOwnershipPerc').addEventListener('change', updateChartDisplay);
    document.getElementById('showJurisdiction').addEventListener('change', updateChartDisplay);
    document.getElementById('showEntityNames').addEventListener('change', updateChartDisplay);
    
    // Close export menu when clicking outside
    document.addEventListener('click', function(event) {
        const exportMenu = document.getElementById('exportMenu');
        const exportButton = event.target.closest('[onclick="toggleExportMenu()"]');
        
        if (!exportButton && !exportMenu.contains(event.target)) {
            exportMenu.classList.add('hidden');
        }
    });
}

// Load org chart data from server
async function loadOrgChartData() {
    try {
        const response = await fetch('/org-chart-data');
        const data = await response.json();
        
        if (data.error) {
            console.error('Error loading chart data:', data.error);
            return;
        }
        
        orgChartData = data;
        populateJurisdictionFilter();
        renderOrgChart();
    } catch (error) {
        console.error('Failed to load chart data:', error);
    }
}

// Populate jurisdiction filter dropdown
function populateJurisdictionFilter() {
    const select = document.getElementById('jurisdictionFilter');
    const jurisdictions = [...new Set(orgChartData.entities
        .map(e => e.ENTITY_TAX_JURISDICTION)
        .filter(j => j && j !== 'None'))];
    
    // Clear existing options except "All Jurisdictions"
    select.innerHTML = '<option value="">All Jurisdictions</option>';
    
    jurisdictions.forEach(jurisdiction => {
        const option = document.createElement('option');
        option.value = jurisdiction;
        option.textContent = jurisdiction;
        select.appendChild(option);
    });
}

// Filter chart based on controls
function filterChart() {
    renderOrgChart();
}

// Update chart display options
function updateChartDisplay() {
    renderOrgChart();
}

// Render D3.js organizational chart
function renderOrgChart() {
    const chartContainer = document.getElementById('orgChart');
    const placeholder = document.getElementById('chartPlaceholder');
    
    // Show placeholder if no data
    if (!orgChartData.entities || orgChartData.entities.length === 0) {
        placeholder.style.display = 'flex';
        return;
    }
    
    placeholder.style.display = 'none';
    
    // Clear previous chart
    d3.select('#orgChart').selectAll('svg').remove();
    
    // Get filtered data
    const filteredData = getFilteredData();
    
    if (filteredData.nodes.length === 0) {
        placeholder.innerHTML = `
            <div class="text-center">
                <i class="fas fa-filter text-6xl mb-4 text-gray-300"></i>
                <p class="text-lg font-medium text-gray-500">No entities match your filters</p>
                <p class="text-sm mt-2 text-gray-400">Try adjusting your search criteria</p>
            </div>
        `;
        placeholder.style.display = 'flex';
        return;
    }
    
    // Set up SVG
    const margin = { top: 40, right: 40, bottom: 40, left: 40 };
    const containerRect = chartContainer.getBoundingClientRect();
    const width = containerRect.width - margin.left - margin.right;
    const height = containerRect.height - margin.top - margin.bottom;
    
    const svg = d3.select('#orgChart')
        .append('svg')
        .attr('width', containerRect.width)
        .attr('height', containerRect.height);
    
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Build hierarchy from filtered data
    let hierarchyData;
    
    console.log('Render state:', { isShowingFocusedView, focusedEntityId });
    console.log('Filtered data:', { nodes: filteredData.nodes.length, links: filteredData.links.length });
    
    if (isShowingFocusedView && focusedEntityId) {
        // Build focused hierarchy around selected entity
        hierarchyData = buildFocusedHierarchy(focusedEntityId, filteredData.nodes, filteredData.links);
        console.log('Focused hierarchy result:', hierarchyData.length);
        
        if (hierarchyData.length === 0) {
            // If focused entity not found, fall back to full view
            console.log('No focused hierarchy found, falling back to full view');
            showError('Focused entity not found in current filters');
            isShowingFocusedView = false;
            focusedEntityId = null;
            updateFocusStatus();
            hierarchyData = buildHierarchy(filteredData.nodes, filteredData.links);
        }
    } else {
        // Build full hierarchy
        console.log('Building full hierarchy');
        hierarchyData = buildHierarchy(filteredData.nodes, filteredData.links);
    }
    
    console.log('Final hierarchy data:', hierarchyData.length);
    
    // Handle multiple trees (multiple root entities)
    const treeWidth = width / hierarchyData.length;
    let xOffset = 0;
    
    const showOwnership = document.getElementById('showOwnershipPerc').checked;
    
    hierarchyData.forEach((rootData, index) => {
        // Create tree layout with better spacing for org charts
        const treeLayout = d3.tree()
            .size([treeWidth - 100, height - 150]) // More conservative sizing
            .separation((a, b) => {
                // Increase separation for better spacing
                if (a.parent === b.parent) {
                    return 2; // Siblings get more space
                } else {
                    return 3; // Different branches get even more space
                }
            });
        
        // Create hierarchy
        const root = d3.hierarchy(rootData);
        treeLayout(root);
        
        // Offset for multiple trees with better spacing
        root.descendants().forEach(d => {
            d.x += xOffset + 50; // More left margin
            d.y += 75; // More top margin
        });
        
        // Sort nodes by depth to ensure deeper levels spread outward
        const nodesByDepth = {};
        root.descendants().forEach(d => {
            if (!nodesByDepth[d.depth]) nodesByDepth[d.depth] = [];
            nodesByDepth[d.depth].push(d);
        });
        
        // Redistribute nodes at each level for better spacing
        Object.keys(nodesByDepth).forEach(depth => {
            const nodes = nodesByDepth[depth];
            if (nodes.length > 1) {
                // Sort by original x position
                nodes.sort((a, b) => a.x - b.x);
                // Redistribute with more spacing
                const levelWidth = treeWidth - 100;
                const spacing = levelWidth / (nodes.length + 1);
                nodes.forEach((node, i) => {
                    node.x = xOffset + 50 + spacing * (i + 1);
                });
            }
        });
        
        // Draw this tree
        drawTree(g, root, showOwnership, focusedEntityId);
        
        xOffset += treeWidth;
    });
    
    // Add zoom behavior
    const zoom = d3.zoom()
        .scaleExtent([0.1, 3])
        .on('zoom', (event) => {
            g.attr('transform', event.transform);
        });
    
    svg.call(zoom);
}

// Get filtered data based on current filter settings
function getFilteredData() {
    const searchTerm = document.getElementById('entitySearch').value.toLowerCase();
    const jurisdictionFilter = document.getElementById('jurisdictionFilter').value;
    const ownershipThreshold = parseFloat(document.getElementById('ownershipThreshold').value);
    const showPersons = document.getElementById('showPersons').checked;
    
    // Start with all entities
    let filteredEntities = orgChartData.entities;
    
    // If we have a focused entity, we need special logic to maintain the complete chain
    if (isShowingFocusedView && focusedEntityId) {
        // Get the complete ownership chain around the focused entity
        const focusedChain = getFocusedEntityChain(focusedEntityId);
        
        // Apply jurisdiction filter while preserving focused entity and ultimate root
        filteredEntities = orgChartData.entities.filter(entity => {
            // Always include the focused entity itself
            if (entity.ENTITY_ID === focusedEntityId) {
                return true;
            }
            
            // Always include ultimate roots (entities with no owners)
            const isUltimateRoot = !orgChartData.ownership.some(rel => rel.CHILD_ID === entity.ENTITY_ID);
            if (isUltimateRoot) {
                return true;
            }
            
            // For entities in the focused chain, apply jurisdiction filter
            if (focusedChain.includes(entity.ENTITY_ID)) {
                if (jurisdictionFilter && entity.ENTITY_TAX_JURISDICTION !== jurisdictionFilter) {
                    return false; // Exclude if not in selected jurisdiction
                }
                return true; // Include if in selected jurisdiction or no filter
            }
            
            // For entities not in focused chain, exclude them (focus mode only shows related entities)
            return false;
        });
        
        // Also apply search filter to the result
        if (searchTerm) {
            filteredEntities = filteredEntities.filter(entity => 
                entity.ENTITY_NAME.toLowerCase().includes(searchTerm) ||
                entity.ENTITY_ID.toLowerCase().includes(searchTerm)
            );
        }
    } else {
        // Normal filtering when not in focused mode
        filteredEntities = orgChartData.entities.filter(entity => {
            if (searchTerm && !entity.ENTITY_NAME.toLowerCase().includes(searchTerm) && 
                !entity.ENTITY_ID.toLowerCase().includes(searchTerm)) {
                return false;
            }
            if (jurisdictionFilter && entity.ENTITY_TAX_JURISDICTION !== jurisdictionFilter) {
                return false;
            }
            return true;
        });
    }
    
    // Filter ownership relationships
    let filteredOwnership = orgChartData.ownership.filter(rel => {
        return rel.OWNERSHIP_PERC >= ownershipThreshold;
    });
    
    // Create nodes array
    let nodes = filteredEntities.map(entity => ({
        id: entity.ENTITY_ID,
        name: entity.ENTITY_NAME,
        jurisdiction: entity.ENTITY_TAX_JURISDICTION,
        type: 'entity'
    }));
    
    // Add persons if enabled
    if (showPersons) {
        const filteredPersons = orgChartData.persons.filter(person => {
            if (searchTerm && !person.PERSON_NAME.toLowerCase().includes(searchTerm) && 
                !person.PERSON_ID.toLowerCase().includes(searchTerm)) {
                return false;
            }
            return true;
        });
        
        const personNodes = filteredPersons.map(person => ({
            id: person.PERSON_ID,
            name: person.PERSON_NAME,
            role: person.PERSON_ROLE,
            entityId: person.ENTITY_ID,
            type: 'person'
        }));
        
        nodes = nodes.concat(personNodes);
    }
    
    // Create links array from ownership data
    let links = filteredOwnership
        .filter(rel => {
            // Only include links where both parent and child exist in filtered entities
            const parentExists = nodes.some(n => n.id === rel.PARENT_ID);
            const childExists = nodes.some(n => n.id === rel.CHILD_ID);
            return parentExists && childExists;
        })
        .map(rel => ({
            source: rel.PARENT_ID,
            target: rel.CHILD_ID,
            ownership: rel.OWNERSHIP_PERC
        }));
    
    // Add person-to-entity links if persons are shown
    if (showPersons) {
        const personLinks = nodes
            .filter(n => n.type === 'person' && n.entityId)
            .filter(person => nodes.some(entity => entity.id === person.entityId))
            .map(person => ({
                source: person.id,
                target: person.entityId,
                ownership: null
            }));
        
        links = links.concat(personLinks);
    }
    
    return { nodes, links };
}

// Get the complete ownership chain for a focused entity
function getFocusedEntityChain(focusedEntityId) {
    const chainIds = new Set([focusedEntityId]);
    
    // Add all shareholders (upward)
    const shareholders = findAllShareholders(focusedEntityId, orgChartData.ownership.map(rel => ({
        source: rel.PARENT_ID,
        target: rel.CHILD_ID,
        ownership: rel.OWNERSHIP_PERC
    })));
    shareholders.forEach(id => chainIds.add(id));
    
    // Add all subsidiaries (downward)
    const subsidiaries = findAllSubsidiaries(focusedEntityId, orgChartData.ownership.map(rel => ({
        source: rel.PARENT_ID,
        target: rel.CHILD_ID,
        ownership: rel.OWNERSHIP_PERC
    })));
    subsidiaries.forEach(id => chainIds.add(id));
    
    return Array.from(chainIds);
}

// Reset all data
async function resetData() {
    if (!confirm('Are you sure you want to reset all data? This action cannot be undone.')) {
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch('/reset-data', {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Clear stored root selection
            userSelectedRootId = null;
            sessionStorage.removeItem('charted_user_root_id');
            
            showSuccess(result.message);
            // Reload the page to reset everything
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } else {
            showError(result.error);
        }
    } catch (error) {
        showError('Reset failed: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Utility functions
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (show) {
        overlay.classList.remove('hidden');
    } else {
        overlay.classList.add('hidden');
    }
}

function showError(message) {
    // Create toast notification
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
    toast.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-exclamation-triangle mr-2"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

function showSuccess(message) {
    // Create toast notification
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
    toast.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-check-circle mr-2"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Handle window resize
window.addEventListener('resize', () => {
    if (orgChartData.entities && orgChartData.entities.length > 0) {
        renderOrgChart();
    }
});

// Focus on specific entity
function focusOnEntity() {
    const input = document.getElementById('entityFocus');
    const searchTerm = input.value.trim();
    
    if (!searchTerm) {
        showError('Please enter an entity ID or name');
        return;
    }
    
    // Find entity by ID or name
    const entity = orgChartData.entities.find(e => 
        e.ENTITY_ID.toLowerCase() === searchTerm.toLowerCase() ||
        e.ENTITY_NAME.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    if (!entity) {
        showError('Entity not found');
        return;
    }
    
    // Update global state
    focusedEntityId = entity.ENTITY_ID;
    isShowingFocusedView = true;
    
    // Debug logging
    console.log('Focus set:', { focusedEntityId, isShowingFocusedView });
    
    updateFocusStatus();
    renderOrgChart();
    showSuccess(`Focused on: ${entity.ENTITY_NAME}`);
}

// Show full chart
function showFullChart() {
    focusedEntityId = null;
    isShowingFocusedView = false;
    document.getElementById('entityFocus').value = '';
    updateFocusStatus();
    renderOrgChart();
    showSuccess('Showing full organizational chart');
}

// Update focus status display
function updateFocusStatus() {
    const statusDiv = document.getElementById('focusStatus');
    
    if (isShowingFocusedView && focusedEntityId) {
        const entity = orgChartData.entities.find(e => e.ENTITY_ID === focusedEntityId);
        statusDiv.innerHTML = `<i class="fas fa-bullseye mr-1"></i>Focused on: ${entity ? entity.ENTITY_NAME : focusedEntityId}`;
        statusDiv.classList.remove('hidden');
    } else {
        statusDiv.classList.add('hidden');
    }
}

// Build focused hierarchy around a specific entity
function buildFocusedHierarchy(entityId, allNodes, allLinks) {
    console.log('Building focused hierarchy for:', entityId);
    console.log('Available nodes:', allNodes.length);
    console.log('Available links:', allLinks.length);
    
    const entity = allNodes.find(n => n.id === entityId);
    if (!entity) {
        console.log('Entity not found in nodes:', entityId);
        return [];
    }
    
    // Find all shareholders (upward traversal)
    const shareholderIds = findAllShareholders(entityId, allLinks);
    console.log('Found shareholders:', shareholderIds);
    
    // Find all subsidiaries (downward traversal)  
    const subsidiaryIds = findAllSubsidiaries(entityId, allLinks);
    console.log('Found subsidiaries:', subsidiaryIds);
    
    // Combine all relevant entity IDs
    const relevantEntityIds = new Set([entityId, ...shareholderIds, ...subsidiaryIds]);
    console.log('Relevant entity IDs:', Array.from(relevantEntityIds));
    
    // Filter nodes to only include relevant entities and their persons
    const relevantNodes = allNodes.filter(node => {
        if (node.type === 'entity') {
            return relevantEntityIds.has(node.id);
        } else if (node.type === 'person') {
            return relevantEntityIds.has(node.entityId);
        }
        return false;
    });
    
    console.log('Filtered nodes:', relevantNodes.length);
    
    // Filter links to only include relevant relationships
    const relevantLinks = allLinks.filter(link => 
        relevantEntityIds.has(link.source) && relevantEntityIds.has(link.target)
    );
    
    console.log('Filtered links:', relevantLinks.length);
    
    // Find ultimate roots from the shareholder chain
    const ultimateRoots = relevantNodes.filter(node => 
        node.type === 'entity' && 
        !relevantLinks.some(link => link.target === node.id && link.ownership !== null)
    );
    
    // If no roots found, use the highest level entities
    if (ultimateRoots.length === 0 && relevantNodes.length > 0) {
        ultimateRoots.push(relevantNodes.filter(n => n.type === 'entity')[0]);
    }
    
    console.log('Ultimate roots found:', ultimateRoots.length);
    
    return ultimateRoots.map(root => buildTreeRecursive(root, relevantNodes, relevantLinks));
}

// Find all shareholders (parents, grandparents, etc.)
function findAllShareholders(entityId, allLinks, visited = new Set()) {
    if (visited.has(entityId)) return []; // Prevent circular references
    visited.add(entityId);
    
    const shareholders = [];
    
    // Find direct shareholders
    const parentLinks = allLinks.filter(link => 
        link.target === entityId && link.ownership !== null
    );
    
    parentLinks.forEach(link => {
        const parentId = link.source;
        shareholders.push(parentId);
        
        // Recursively find shareholders of this parent
        const grandparents = findAllShareholders(parentId, allLinks, visited);
        shareholders.push(...grandparents);
    });
    
    return [...new Set(shareholders)]; // Remove duplicates
}

// Find all subsidiaries (children, grandchildren, etc.)
function findAllSubsidiaries(entityId, allLinks, visited = new Set()) {
    if (visited.has(entityId)) return []; // Prevent circular references
    visited.add(entityId);
    
    const subsidiaries = [];
    
    // Find direct subsidiaries
    const childLinks = allLinks.filter(link => 
        link.source === entityId && link.ownership !== null
    );
    
    childLinks.forEach(link => {
        const childId = link.target;
        subsidiaries.push(childId);
        
        // Recursively find subsidiaries of this child
        const grandchildren = findAllSubsidiaries(childId, allLinks, visited);
        subsidiaries.push(...grandchildren);
    });
    
    return [...new Set(subsidiaries)]; // Remove duplicates
}

// Global variable to store user-selected root (persisted in sessionStorage)
let userSelectedRootId = sessionStorage.getItem('charted_user_root_id');

// Handle user root selection from input field
function selectUserRoot() {
    const input = document.getElementById('rootEntityInput');
    const searchTerm = input.value.trim();
    
    if (!searchTerm) {
        showError('Please enter an entity ID or name');
        return;
    }
    
    // Find entity by ID or name
    const entity = orgChartData.entities.find(e => 
        e.ENTITY_ID.toLowerCase() === searchTerm.toLowerCase() ||
        e.ENTITY_NAME.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    if (!entity) {
        showError('Entity not found. Please check the ID or name.');
        return;
    }
    
    // Set as root and rebuild chart
    userSelectedRootId = entity.ENTITY_ID;
    sessionStorage.setItem('charted_user_root_id', userSelectedRootId);
    showSuccess(`Set "${entity.ENTITY_NAME}" as organizational root`);
    renderOrgChart();
}

// Handle selection of specific root from list
function selectSpecificRoot(entityId) {
    const entity = orgChartData.entities.find(e => e.ENTITY_ID === entityId);
    if (entity) {
        userSelectedRootId = entityId;
        sessionStorage.setItem('charted_user_root_id', userSelectedRootId);
        showSuccess(`Set "${entity.ENTITY_NAME}" as organizational root`);
        renderOrgChart();
    }
}

// Show entity browser for selection
function showEntityList() {
    const placeholder = document.getElementById('chartPlaceholder');
    
    // Get entities sorted by name for easier browsing
    const sortedEntities = orgChartData.entities
        .slice() // Create copy to avoid mutating original
        .sort((a, b) => a.ENTITY_NAME.localeCompare(b.ENTITY_NAME));
    
    const dialogHTML = `
        <div class="text-center max-w-2xl mx-auto">
            <i class="fas fa-list text-6xl mb-4 text-blue-500"></i>
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Select Root Entity</h3>
            <p class="text-sm text-gray-600 mb-4">
                Choose which entity should be the top-level root of your organizational chart.
            </p>
            
            <div class="mb-4">
                <input type="text" id="entityBrowserSearch" placeholder="Search entities..." 
                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                       onkeyup="filterEntityList()">
            </div>
            
            <div id="entityListContainer" class="max-h-60 overflow-y-auto border border-gray-200 rounded-md">
                ${sortedEntities.map(entity => `
                    <button onclick="selectSpecificRoot('${entity.ENTITY_ID}')" 
                            class="entity-list-item w-full text-left px-3 py-2 border-b border-gray-100 hover:bg-blue-50 transition-colors"
                            data-name="${entity.ENTITY_NAME.toLowerCase()}"
                            data-id="${entity.ENTITY_ID.toLowerCase()}">
                        <div class="font-medium">${entity.ENTITY_NAME}</div>
                        <div class="text-xs text-gray-500">${entity.ENTITY_ID}${entity.ENTITY_TAX_JURISDICTION ? ' • ' + entity.ENTITY_TAX_JURISDICTION : ''}</div>
                    </button>
                `).join('')}
            </div>
            
            <button onclick="cancelRootSelection()" 
                    class="mt-4 bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors">
                Cancel
            </button>
        </div>
    `;
    
    placeholder.innerHTML = dialogHTML;
}

// Filter entity list based on search
function filterEntityList() {
    const searchTerm = document.getElementById('entityBrowserSearch').value.toLowerCase();
    const items = document.querySelectorAll('.entity-list-item');
    
    items.forEach(item => {
        const name = item.getAttribute('data-name');
        const id = item.getAttribute('data-id');
        
        if (name.includes(searchTerm) || id.includes(searchTerm)) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

// Cancel root selection and show default message
function cancelRootSelection() {
    const placeholder = document.getElementById('chartPlaceholder');
    placeholder.innerHTML = `
        <div class="text-center">
            <i class="fas fa-sitemap text-6xl mb-4 text-gray-300"></i>
            <p class="text-lg font-medium">Select a root entity to view the organizational chart</p>
            <p class="text-sm mt-2">Use the controls above to specify the top-level entity</p>
        </div>
    `;
    placeholder.style.display = 'flex';
}

// Export functionality
function toggleExportMenu() {
    const menu = document.getElementById('exportMenu');
    menu.classList.toggle('hidden');
}

// Export chart as SVG (best for PowerPoint)
function exportAsSVG() {
    const svg = document.querySelector('#orgChart svg');
    if (!svg) {
        showError('No chart to export. Please ensure data is loaded.');
        return;
    }
    
    // Clone the SVG to avoid modifying the original
    const svgClone = svg.cloneNode(true);
    
    // Add white background for better PowerPoint compatibility
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('width', '100%');
    rect.setAttribute('height', '100%');
    rect.setAttribute('fill', 'white');
    svgClone.insertBefore(rect, svgClone.firstChild);
    
    // Add title and metadata
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    const chartTitle = isShowingFocusedView && focusedEntityId ? 
        `Organizational Chart - Focused on ${getEntityName(focusedEntityId)}` : 
        'Organizational Chart - Full View';
    title.textContent = chartTitle;
    svgClone.insertBefore(title, svgClone.firstChild);
    
    // Create download
    const svgData = new XMLSerializer().serializeToString(svgClone);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    downloadFile(blob, `org-chart-${getExportFilename()}.svg`);
    
    document.getElementById('exportMenu').classList.add('hidden');
    showSuccess('SVG exported! Perfect for inserting into PowerPoint.');
}

// Export chart as high-resolution PNG
function exportAsPNG() {
    const svg = document.querySelector('#orgChart svg');
    if (!svg) {
        showError('No chart to export. Please ensure data is loaded.');
        return;
    }
    
    // Create a canvas for high-resolution export
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set high resolution (2x for retina/high-DPI)
    const scale = 2;
    const svgRect = svg.getBoundingClientRect();
    canvas.width = svgRect.width * scale;
    canvas.height = svgRect.height * scale;
    
    // Scale the context for high resolution
    ctx.scale(scale, scale);
    
    // Add white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, svgRect.width, svgRect.height);
    
    // Convert SVG to image
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    
    img.onload = function() {
        ctx.drawImage(img, 0, 0, svgRect.width, svgRect.height);
        
        // Convert to PNG and download
        canvas.toBlob(function(blob) {
            downloadFile(blob, `org-chart-${getExportFilename()}.png`);
            showSuccess('PNG exported! High-resolution image ready for PowerPoint.');
        }, 'image/png', 1.0);
    };
    
    img.onerror = function() {
        showError('Failed to export PNG. Try SVG export instead.');
    };
    
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml' });
    img.src = URL.createObjectURL(svgBlob);
    
    document.getElementById('exportMenu').classList.add('hidden');
}

// Export as standalone HTML file
function exportAsHTML() {
    const chartTitle = isShowingFocusedView && focusedEntityId ? 
        `Organizational Chart - Focused on ${getEntityName(focusedEntityId)}` : 
        'Organizational Chart - Full View';
    
    // Get current chart SVG
    const svg = document.querySelector('#orgChart svg');
    if (!svg) {
        showError('No chart to export. Please ensure data is loaded.');
        return;
    }
    
    const svgContent = svg.outerHTML;
    
    // Create standalone HTML with embedded CSS and chart
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${chartTitle}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f9fafb;
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
            padding: 20px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        .chart-container {
            background: white;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            padding: 20px;
            overflow: auto;
        }
        .metadata {
            margin-top: 20px;
            padding: 15px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            font-size: 14px;
            color: #6b7280;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Charted</h1>
        <h2>${chartTitle}</h2>
        <p>Interactive Organizational Chart</p>
    </div>
    
    <div class="chart-container">
        ${svgContent}
    </div>
    
    <div class="metadata">
        <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>Entities:</strong> ${orgChartData.entities.length}</p>
        <p><strong>Ownership Relationships:</strong> ${orgChartData.ownership.length}</p>
        <p><strong>People:</strong> ${orgChartData.persons.length}</p>
        ${isShowingFocusedView ? '<p><strong>View:</strong> Focused View (Subset of full organization)</p>' : '<p><strong>View:</strong> Complete Organization</p>'}
    </div>
    
    <script>
        // Add zoom functionality to exported HTML
        const svg = document.querySelector('svg');
        let scale = 1;
        let translateX = 0;
        let translateY = 0;
        
        svg.addEventListener('wheel', function(e) {
            e.preventDefault();
            const delta = e.deltaY;
            const scaleStep = 0.1;
            
            if (delta > 0) {
                scale = Math.max(0.1, scale - scaleStep);
            } else {
                scale = Math.min(3, scale + scaleStep);
            }
            
            const g = svg.querySelector('g');
            g.setAttribute('transform', \`translate(\${translateX}, \${translateY}) scale(\${scale})\`);
        });
        
        // Add pan functionality
        let isDragging = false;
        let lastX, lastY;
        
        svg.addEventListener('mousedown', function(e) {
            isDragging = true;
            lastX = e.clientX;
            lastY = e.clientY;
            svg.style.cursor = 'grabbing';
        });
        
        svg.addEventListener('mousemove', function(e) {
            if (!isDragging) return;
            
            const deltaX = e.clientX - lastX;
            const deltaY = e.clientY - lastY;
            
            translateX += deltaX;
            translateY += deltaY;
            
            const g = svg.querySelector('g');
            g.setAttribute('transform', \`translate(\${translateX}, \${translateY}) scale(\${scale})\`);
            
            lastX = e.clientX;
            lastY = e.clientY;
        });
        
        svg.addEventListener('mouseup', function() {
            isDragging = false;
            svg.style.cursor = 'grab';
        });
        
        svg.style.cursor = 'grab';
    </script>
</body>
</html>`;
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    downloadFile(blob, `org-chart-${getExportFilename()}.html`);
    
    document.getElementById('exportMenu').classList.add('hidden');
    showSuccess('HTML exported! Can be embedded as web object in PowerPoint.');
}

// Helper function to download files
function downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Helper function to get export filename
function getExportFilename() {
    const timestamp = new Date().toISOString().slice(0, 16).replace(/[:-]/g, '');
    const viewType = isShowingFocusedView ? 'focused' : 'full';
    const entityName = isShowingFocusedView && focusedEntityId ? 
        `-${getEntityName(focusedEntityId).replace(/[^a-zA-Z0-9]/g, '_')}` : '';
    return `${viewType}${entityName}_${timestamp}`;
}

// Helper function to get entity name by ID
function getEntityName(entityId) {
    const entity = orgChartData.entities.find(e => e.ENTITY_ID === entityId);
    return entity ? entity.ENTITY_NAME : entityId;
}

// Build hierarchy from nodes and links
function buildHierarchy(nodes, links) {
    console.log('Building hierarchy with', nodes.length, 'nodes and', links.length, 'links');
    
    // Check for and report circular references
    const circularRefs = detectCircularReferences(links);
    if (circularRefs.length > 0) {
        console.warn('Circular references detected:', circularRefs);
        showError(`Warning: ${circularRefs.length} circular ownership relationships detected. Chart will show simplified view.`);
    }
    
    // If user has selected a specific root, use that
    if (userSelectedRootId) {
        const userRoot = nodes.find(n => n.id === userSelectedRootId);
        if (userRoot) {
            console.log('Using user-selected root:', userRoot.name);
            return [buildTreeRecursive(userRoot, nodes, links)];
        } else {
            console.log('User-selected root not found in filtered data, but keeping selection');
            // Don't clear the selection - user root might be filtered out temporarily
            return []; // Show empty chart when root is filtered out
        }
    }
    
    // For automatic root detection, use the FULL dataset to avoid filter artifacts
    const fullNodes = orgChartData.entities.map(entity => ({
        id: entity.ENTITY_ID,
        name: entity.ENTITY_NAME,
        jurisdiction: entity.ENTITY_TAX_JURISDICTION,
        type: 'entity'
    }));
    
    const fullLinks = orgChartData.ownership.map(rel => ({
        source: rel.PARENT_ID,
        target: rel.CHILD_ID,
        ownership: rel.OWNERSHIP_PERC
    }));
    
    // Find root entities in FULL dataset (no incoming ownership links)
    const trueRoots = fullNodes.filter(node => 
        node.type === 'entity' && 
        !fullLinks.some(link => link.target === node.id && link.ownership !== null)
    );
    
    console.log('Found true root entities in full dataset:', trueRoots.length);
    
    // Case A: Exactly one true root - perfect!
    if (trueRoots.length === 1) {
        console.log('Perfect! Found exactly one true root:', trueRoots[0].name);
        // Check if the root exists in filtered data
        const filteredRoot = nodes.find(n => n.id === trueRoots[0].id);
        if (filteredRoot) {
            return [buildTreeRecursive(filteredRoot, nodes, links)];
        } else {
            console.log('True root filtered out by current filters');
            return []; // Return empty - root is filtered out
        }
    }
    
    // Case B: No true roots or multiple true roots - need user input
    if (trueRoots.length === 0) {
        console.log('No true root entities found in full dataset - user input required');
        showRootSelectionDialog([], fullNodes);
        return []; // Return empty until user selects
    } else {
        console.log('Multiple true roots found in full dataset - user must choose one');
        // Filter the true roots to only show those available in current filtered view
        const availableTrueRoots = trueRoots.filter(root => 
            nodes.some(n => n.id === root.id)
        );
        showRootSelectionDialog(availableTrueRoots.length > 0 ? availableTrueRoots : trueRoots, fullNodes);
        return []; // Return empty until user selects
    }
}

// Show dialog for user to select root entity
function showRootSelectionDialog(trueRoots, allNodes) {
    // Hide the chart and show selection interface
    const chartContainer = document.getElementById('orgChart');
    const placeholder = document.getElementById('chartPlaceholder');
    
    let dialogHTML;
    
    if (trueRoots.length === 0) {
        // No true roots - let user pick any entity
        dialogHTML = `
            <div class="text-center max-w-md mx-auto">
                <i class="fas fa-question-circle text-6xl mb-4 text-blue-500"></i>
                <h3 class="text-lg font-semibold text-gray-900 mb-2">No Root Entity Found</h3>
                <p class="text-sm text-gray-600 mb-4">
                    Every entity in your data has at least one owner. Please specify which entity 
                    should be the top-level root of your organizational chart.
                </p>
                <div class="space-y-3">
                    <input type="text" id="rootEntityInput" placeholder="Enter Entity ID or Name" 
                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <div class="flex space-x-2">
                        <button onclick="selectUserRoot()" 
                                class="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
                            Set as Root
                        </button>
                        <button onclick="showEntityList()" 
                                class="flex-1 bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors">
                            Browse Entities
                        </button>
                    </div>
                </div>
            </div>
        `;
    } else {
        // Multiple true roots - let user choose
        dialogHTML = `
            <div class="text-center max-w-md mx-auto">
                <i class="fas fa-sitemap text-6xl mb-4 text-blue-500"></i>
                <h3 class="text-lg font-semibold text-gray-900 mb-2">Multiple Root Entities Found</h3>
                <p class="text-sm text-gray-600 mb-4">
                    Found ${trueRoots.length} entities with no owners. Please select which one should be 
                    the main root for your organizational chart.
                </p>
                <div class="space-y-2 max-h-40 overflow-y-auto">
                    ${trueRoots.map(root => `
                        <button onclick="selectSpecificRoot('${root.id}')" 
                                class="w-full text-left px-3 py-2 border border-gray-300 rounded-md hover:bg-blue-50 hover:border-blue-300 transition-colors">
                            <div class="font-medium">${root.name}</div>
                            <div class="text-xs text-gray-500">${root.id}</div>
                        </button>
                    `).join('')}
                </div>
                <button onclick="showEntityList()" 
                        class="mt-3 w-full bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors">
                    Browse All Entities Instead
                </button>
            </div>
        `;
    }
    
    placeholder.innerHTML = dialogHTML;
    placeholder.style.display = 'flex';
}

// Detect circular references in ownership data
function detectCircularReferences(links) {
    const ownershipLinks = links.filter(link => link.ownership !== null);
    const cycles = [];
    const visited = new Set();
    const recursionStack = new Set();
    
    // Get all unique entity IDs
    const entityIds = new Set();
    ownershipLinks.forEach(link => {
        entityIds.add(link.source);
        entityIds.add(link.target);
    });
    
    // DFS to detect cycles
    function dfs(entityId, path = []) {
        if (recursionStack.has(entityId)) {
            // Found a cycle
            const cycleStart = path.indexOf(entityId);
            const cycle = path.slice(cycleStart).concat([entityId]);
            cycles.push(cycle);
            return true;
        }
        
        if (visited.has(entityId)) {
            return false;
        }
        
        visited.add(entityId);
        recursionStack.add(entityId);
        path.push(entityId);
        
        // Check all children
        const children = ownershipLinks
            .filter(link => link.source === entityId)
            .map(link => link.target);
        
        for (const child of children) {
            if (dfs(child, [...path])) {
                break; // Stop after finding first cycle in this path
            }
        }
        
        recursionStack.delete(entityId);
        return false;
    }
    
    // Check each entity
    for (const entityId of entityIds) {
        if (!visited.has(entityId)) {
            dfs(entityId);
        }
    }
    
    return cycles;
}

// Recursively build tree structure
function buildTreeRecursive(node, allNodes, allLinks, visited = new Set()) {
    // Prevent circular references - stop if we've already processed this node
    if (visited.has(node.id)) {
        console.log('Circular reference detected for node:', node.id);
        return {
            ...node,
            children: [] // Stop recursion here
        };
    }
    
    // Add current node to visited set
    visited.add(node.id);
    
    // Find children (entities this node owns)
    const childLinks = allLinks.filter(link => 
        link.source === node.id && link.ownership !== null
    );
    
    const children = childLinks.map(link => {
        const childNode = allNodes.find(n => n.id === link.target);
        if (childNode) {
            // Create a new visited set for each branch to allow the same entity
            // to appear in different parts of the tree (but not in the same branch)
            const branchVisited = new Set(visited);
            const childTree = buildTreeRecursive(childNode, allNodes, allLinks, branchVisited);
            childTree.ownershipPerc = link.ownership; // Store ownership info
            return childTree;
        }
        return null;
    }).filter(Boolean);
    
    // Add persons associated with this entity
    const persons = allNodes.filter(n => 
        n.type === 'person' && n.entityId === node.id
    );
    
    const personChildren = persons.map(person => ({
        ...person,
        children: [],
        ownershipPerc: null
    }));
    
    // Remove current node from visited set before returning
    // This allows the node to appear in other branches
    visited.delete(node.id);
    
    return {
        ...node,
        children: [...children, ...personChildren]
    };
}

// Draw tree with nodes and links
function drawTree(container, root, showOwnership, focusedEntityId = null) {
    // Clear any existing elements to prevent conflicts
    container.selectAll('.tree-link').remove();
    container.selectAll('.ownership-label').remove();
    container.selectAll('.tree-node').remove();
    
    // Add links with rectangular "elbow" connectors
    const links = container.selectAll('.tree-link')
        .data(root.links())
        .enter().append('path')
        .attr('class', 'tree-link')
        .attr('d', d => {
            // Create 90-degree elbow connector
            const sourceX = d.source.x;
            const sourceY = d.source.y;
            const targetX = d.target.x;
            const targetY = d.target.y;
            
            // Calculate the elbow point (halfway down from parent)
            const elbowY = sourceY + (targetY - sourceY) * 0.6;
            
            return `M${sourceX},${sourceY} 
                   V${elbowY} 
                   H${targetX} 
                   V${targetY}`;
        })
        .attr('fill', 'none')
        .attr('stroke', d => {
            // Highlight path to focused entity
            if (focusedEntityId && 
                (d.source.data.id === focusedEntityId || d.target.data.id === focusedEntityId)) {
                return '#f59e0b'; // Orange for focused path
            }
            return '#999';
        })
        .attr('stroke-width', d => {
            const ownership = d.target.data.ownershipPerc;
            const baseWidth = ownership ? Math.sqrt(ownership / 10) + 1 : 2;
            // Make focused paths thicker
            if (focusedEntityId && 
                (d.source.data.id === focusedEntityId || d.target.data.id === focusedEntityId)) {
                return baseWidth + 1;
            }
            return baseWidth;
        });
    
    // Add ownership labels on links if enabled
    if (showOwnership) {
        container.selectAll('.ownership-label')
            .data(root.links().filter(d => d.target.data.ownershipPerc))
            .enter().append('text')
            .attr('class', 'ownership-label')
            .attr('x', d => {
                // Position on the horizontal part of the elbow
                return (d.source.x + d.target.x) / 2;
            })
            .attr('y', d => {
                // Position on the elbow bend
                const elbowY = d.source.y + (d.target.y - d.source.y) * 0.6;
                return elbowY - 5; // Slightly above the line
            })
            .attr('text-anchor', 'middle')
            .attr('font-size', '11px')
            .attr('font-weight', 'bold')
            .attr('fill', '#fff')
            .attr('stroke', '#666')
            .attr('stroke-width', 3)
            .attr('paint-order', 'stroke fill') // White outline for readability
            .text(d => `${d.target.data.ownershipPerc}%`);
    }
    
    // Add nodes
    const nodes = container.selectAll('.tree-node')
        .data(root.descendants())
        .enter().append('g')
        .attr('class', 'tree-node')
        .attr('transform', d => `translate(${d.x},${d.y})`)
        .style('cursor', 'pointer')
        .on('click', function(event, d) {
            // Click to focus on entity
            if (d.data.type === 'entity') {
                // Update global state properly
                window.focusedEntityId = d.data.id;
                window.isShowingFocusedView = true;
                document.getElementById('entityFocus').value = d.data.name;
                updateFocusStatus();
                renderOrgChart();
                showSuccess(`Focused on: ${d.data.name}`);
            }
        });
    
    // Node shapes - squares for entities, circles for persons
    nodes.append('rect')
        .attr('width', d => d.data.type === 'person' ? 16 : 60) // Wider boxes for Entity IDs
        .attr('height', d => d.data.type === 'person' ? 16 : 30) // Taller boxes for Entity IDs
        .attr('x', d => d.data.type === 'person' ? -8 : -30)
        .attr('y', d => d.data.type === 'person' ? -8 : -15)
        .attr('rx', d => d.data.type === 'person' ? 8 : 3) // Slightly more rounded for entities
        .attr('ry', d => d.data.type === 'person' ? 8 : 3)
        .attr('fill', d => {
            // Highlight focused entity
            if (focusedEntityId && d.data.id === focusedEntityId) {
                return '#dc2626'; // Red for focused entity
            }
            return d.data.type === 'person' ? '#10b981' : '#3b82f6';
        })
        .attr('stroke', d => {
            // Special border for focused entity
            if (focusedEntityId && d.data.id === focusedEntityId) {
                return '#fbbf24'; // Gold border
            }
            return '#fff';
        })
        .attr('stroke-width', d => {
            // Thicker border for focused entity
            if (focusedEntityId && d.data.id === focusedEntityId) {
                return 3;
            }
            return 2;
        });
    
    // Entity IDs inside boxes (for entities only)
    nodes.filter(d => d.data.type === 'entity')
        .append('text')
        .attr('dy', 2) // Center vertically in the box
        .attr('text-anchor', 'middle')
        .attr('font-size', '11px')
        .attr('font-weight', 'bold')
        .attr('fill', d => {
            // White text for better contrast on colored backgrounds
            return '#fff';
        })
        .text(d => d.data.id);
    
    // Person names inside circles (for persons only)
    nodes.filter(d => d.data.type === 'person')
        .append('text')
        .attr('dy', 2) // Center vertically
        .attr('text-anchor', 'middle')
        .attr('font-size', '8px')
        .attr('font-weight', 'bold')
        .attr('fill', '#fff')
        .text(d => d.data.name.split(' ').map(n => n[0]).join('').substring(0, 3)); // Initials
    
    // Optional Entity Names below boxes
    const showEntityNames = document.getElementById('showEntityNames').checked;
    if (showEntityNames) {
        nodes.filter(d => d.data.type === 'entity')
            .append('text')
            .attr('dy', 25) // Below the box
            .attr('text-anchor', 'middle')
            .attr('font-size', '11px')
            .attr('font-weight', 'normal')
            .attr('fill', d => {
                // Different color for focused entity label
                if (focusedEntityId && d.data.id === focusedEntityId) {
                    return '#dc2626';
                }
                return '#374151';
            })
            .text(d => {
                // Truncate long names
                const name = d.data.name;
                return name.length > 20 ? name.substring(0, 17) + '...' : name;
            });
    }
    
    // Person names below circles (always shown for persons)
    nodes.filter(d => d.data.type === 'person')
        .append('text')
        .attr('dy', -14) // Above the circle
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('font-weight', 'bold')
        .attr('fill', '#374151')
        .text(d => {
            const name = d.data.name;
            return name.length > 15 ? name.substring(0, 12) + '...' : name;
        });
    
    // Jurisdiction labels if enabled
    const showJurisdiction = document.getElementById('showJurisdiction').checked;
    if (showJurisdiction) {
        nodes.filter(d => d.data.jurisdiction && d.data.type !== 'person')
            .append('text')
            .attr('dy', showEntityNames ? 40 : 25) // Position below entity names if shown
            .attr('text-anchor', 'middle')
            .attr('font-size', '9px')
            .attr('font-style', 'italic')
            .attr('fill', '#6b7280')
            .text(d => d.data.jurisdiction);
    }
    
    // Tooltips
    nodes.append('title')
        .text(d => {
            let tooltip = '';
            if (d.data.type === 'person') {
                tooltip = `${d.data.name}${d.data.role ? ` (${d.data.role})` : ''}`;
            } else {
                tooltip = `${d.data.name}${d.data.jurisdiction ? ` - ${d.data.jurisdiction}` : ''}`;
            }
            
            // Add click instruction for entities
            if (d.data.type === 'entity') {
                tooltip += '\nClick to focus on this entity';
            }
            
            return tooltip;
        });
}
