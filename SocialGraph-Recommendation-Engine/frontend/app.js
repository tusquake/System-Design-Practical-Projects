let cy = null;

async function fetchData() {
    try {
        const response = await fetch('http://localhost:8080/v1/graph/all');
        const users = await response.json();
        
        const elements = [];
        const processedNodes = new Set();

        users.forEach(user => {
            // Add User Node
            if (!processedNodes.has(user.username)) {
                elements.push({
                    data: { id: user.username, label: user.name || user.username, type: 'user' }
                });
                processedNodes.has(user.username);
            }

            // Add Following Relationships
            if (user.following) {
                user.following.forEach(friend => {
                    elements.push({
                        data: { 
                            id: `${user.username}-follows-${friend.username}`, 
                            source: user.username, 
                            target: friend.username,
                            label: 'FOLLOWS'
                        }
                    });
                });
            }

            // Add Interest Relationships
            if (user.interests) {
                user.interests.forEach(interest => {
                    // Add Interest Node if not exists
                    if (!processedNodes.has(interest.name)) {
                        elements.push({
                            data: { id: interest.name, label: interest.name, type: 'interest' }
                        });
                        processedNodes.add(interest.name);
                    }
                    // Add Link
                    elements.push({
                        data: { 
                            id: `${user.username}-likes-${interest.name}`, 
                            source: user.username, 
                            target: interest.name,
                            label: 'LIKES'
                        }
                    });
                });
            }
        });

        updateGraph(elements);
        document.getElementById('node-count').innerText = elements.filter(e => !e.data.source).length;
        document.getElementById('edge-count').innerText = elements.filter(e => e.data.source).length;

    } catch (error) {
        console.error('Error fetching graph data:', error);
        alert('Make sure your Spring Boot backend is running on port 8080!');
    }
}

function updateGraph(elements) {
    cy = cytoscape({
        container: document.getElementById('cy'),
        elements: elements,
        style: [
            {
                selector: 'node[type="user"]',
                style: {
                    'background-color': '#c084fc',
                    'label': 'data(label)',
                    'color': '#fff',
                    'text-valign': 'center',
                    'width': 40,
                    'height': 40,
                    'font-size': '10px'
                }
            },
            {
                selector: 'node[type="interest"]',
                style: {
                    'background-color': '#fb923c',
                    'label': 'data(label)',
                    'color': '#fff',
                    'text-valign': 'center',
                    'width': 30,
                    'height': 30,
                    'font-size': '8px',
                    'shape': 'diamond'
                }
            },
            {
                selector: 'edge',
                style: {
                    'width': 2,
                    'line-color': '#38bdf8',
                    'target-arrow-color': '#38bdf8',
                    'target-arrow-shape': 'triangle',
                    'curve-style': 'bezier',
                    'opacity': 0.6,
                    'label': 'data(label)',
                    'font-size': '6px',
                    'color': '#94a3b8'
                }
            }
        ],
        layout: {
            name: 'cose',
            animate: true
        }
    });
}

function runLayout() {
    if (cy) {
        cy.layout({ name: 'cose', animate: true }).run();
    }
}

// Initial fetch
fetchData();
