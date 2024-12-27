

let processes = [];

function toggleQuantumInput() {
    const algorithm = document.getElementById('algorithm').value;
    const quantumInput = document.getElementById('quantum');

    if (algorithm === 'roundRobin') {
        quantumInput.disabled = false;
    } else {
        quantumInput.disabled = true;
    }
}

function addProcess() {
    const table = document.getElementById('processTable');
    const row = table.insertRow();

    const pid = processes.length;
    const arrivalInput = document.createElement('input');
    const burstInput = document.createElement('input');
    const priorityInput = document.createElement('input');

    arrivalInput.type = burstInput.type = priorityInput.type = 'number';
    arrivalInput.min = burstInput.min = priorityInput.min = '0';

    row.insertCell(0).innerText = `P${pid}`;
    row.insertCell(1).appendChild(arrivalInput);
    row.insertCell(2).appendChild(burstInput);
    row.insertCell(3).appendChild(priorityInput);

    processes.push({
        pid,
        arrivalInput,
        burstInput,
        priorityInput,
    });
}

/**
 * Runs the selected CPU scheduling algorithm with the prepared processes and time quantum.
 * @param {string} algorithm - The selected algorithm (e.g. roundRobin, srt, sjn, priority).
 * @param {number} quantum - The time quantum for the selected algorithm.
 */
function runScheduling() {
    // Get the selected algorithm from the dropdown menu
    const algorithm = document.getElementById('algorithm').value;
    // Get the time quantum value from the input field and convert it to an integer
    const quantum = parseInt(document.getElementById('quantum').value);

    // Prepare the processes by mapping over the global 'processes' array
    const preparedProcesses = processes.map(p => ({
        // Assign process ID
        pid: p.pid,
        // Parse and assign arrival time, default to 0 if invalid
        arrivalTime: parseInt(p.arrivalInput.value) || 0,
        // Parse and assign burst time, default to 0 if invalid
        burstTime: parseInt(p.burstInput.value) || 0,
        // Parse and assign priority, default to 0 if invalid
        priority: parseInt(p.priorityInput.value) || 0,
        // Initialize remaining time as burst time
        remainingTime: parseInt(p.burstInput.value) || 0,
        // Initialize completion time to 0
        completionTime: 0,
        // Initialize waiting time to 0
        waitingTime: 0,
        // Initialize turnaround time to 0
        turnaroundTime: 0,
    }))
        // Filter out processes with burst time less than or equal to 0
        .filter(p => p.burstTime > 0);

    // Dynamically call the function for the selected algorithm
    // If the algorithm is unknown, alert the user
    (window[`run${algorithm.charAt(0).toUpperCase()}${algorithm.slice(1)}`] || (() => alert('Unknown algorithm')))(preparedProcesses, quantum);
}

function runRoundRobin(preparedProcesses, quantum) {
    let currentTime = 0; // Initialize the current time
    let queue = []; // Initialize the process queue
    let ganttChart = []; // Initialize the Gantt Chart representation
    let remainingProcesses = preparedProcesses.length; // Count of processes yet to finish

    // Loop until all processes are completed
    while (remainingProcesses > 0) {
        // Add all processes that have arrived by the current time to the queue
        preparedProcesses.forEach(p => {
            if (p.arrivalTime <= currentTime && !queue.includes(p) && p.remainingTime > 0) {
                queue.push(p);
            }
        });

        // If the queue is empty, advance time to the next process's arrival
        if (queue.length === 0) {
            currentTime++;
            continue;
        }

        // Dequeue the next process to execute
        const process = queue.shift();

        // Calculate the execution time for the process
        const execTime = Math.min(quantum, process.remainingTime);

        // Update the process's remaining time and the current time
        process.remainingTime -= execTime;
        currentTime += execTime;

        // Log the execution in the Gantt Chart
        ganttChart.push({ pid: process.pid, execTime, startTime: currentTime - execTime, endTime: currentTime });

        // If the process has finished, update its metrics and reduce the count of remaining processes
        if (process.remainingTime === 0) {
            process.completionTime = currentTime;
            process.turnaroundTime = process.completionTime - process.arrivalTime;
            process.waitingTime = process.turnaroundTime - process.burstTime;
            remainingProcesses--;
        } else {
            // Re-enqueue the process if it still has burst time left
            queue.push(process);
        }
    }

    // Display the results
    displayResults(preparedProcesses, ganttChart);
}


function runSRT(preparedProcesses) {
    let currentTime = 0;
    let ganttChart = [];

    while (true) {
        preparedProcesses.sort((a, b) => (a.remainingTime - b.remainingTime)); // Sort by remaining time
        const process = preparedProcesses.find(p => p.arrivalTime <= currentTime && p.remainingTime > 0);
        if (!process) break;

        const execTime = process.remainingTime;
        ganttChart.push({ pid: process.pid, execTime });
        currentTime += execTime;
        process.remainingTime = 0;

        process.completionTime = currentTime;
        process.turnaroundTime = process.completionTime - process.arrivalTime;
        process.waitingTime = process.turnaroundTime - process.burstTime;
    }

    displayResults(preparedProcesses, ganttChart);
}

function runSJN(preparedProcesses) {
    let currentTime = 0;
    let ganttChart = [];

    while (true) {
        preparedProcesses.sort((a, b) => (a.burstTime - b.burstTime)); // Sort by burst time
        const process = preparedProcesses.find(p => p.arrivalTime <= currentTime && p.remainingTime > 0);
        if (!process) break;

        const execTime = process.burstTime;
        ganttChart.push({ pid: process.pid, execTime });
        currentTime += execTime;
        process.remainingTime = 0;

        process.completionTime = currentTime;
        process.turnaroundTime = process.completionTime - process.arrivalTime;
        process.waitingTime = process.turnaroundTime - process.burstTime;
    }

    displayResults(preparedProcesses, ganttChart);
}

function runPriority(preparedProcesses) {
    let currentTime = 0;
    let ganttChart = [];

    while (true) {
        preparedProcesses.sort((a, b) => (a.priority - b.priority)); // Sort by priority (ascending)
        const process = preparedProcesses.find(p => p.arrivalTime <= currentTime && p.remainingTime > 0);
        if (!process) break;

        const execTime = process.burstTime;
        ganttChart.push({ pid: process.pid, execTime });
        currentTime += execTime;
        process.remainingTime = 0;

        process.completionTime = currentTime;
        process.turnaroundTime = process.completionTime - process.arrivalTime;
        process.waitingTime = process.turnaroundTime - process.burstTime;
    }

    displayResults(preparedProcesses, ganttChart);
}

function displayResults(preparedProcesses, ganttChart) {
    const ganttDiv = document.getElementById('ganttChart');
    ganttDiv.innerHTML = '';

    ganttChart.forEach(block => {
        const div = document.createElement('div');
        div.innerText = `P${block.pid}(${block.execTime})`;
        ganttDiv.appendChild(div);
    });

    const resultsTable = document.getElementById('resultsTable');
    resultsTable.innerHTML = '';

    let totalTAT = 0;
    let totalWT = 0;

    preparedProcesses.forEach(p => {
        const row = resultsTable.insertRow();
        row.insertCell(0).innerText = `P${p.pid}`;
        row.insertCell(1).innerText = p.completionTime;
        row.insertCell(2).innerText = p.turnaroundTime;
        row.insertCell(3).innerText = p.waitingTime;

        totalTAT += p.turnaroundTime;
        totalWT += p.waitingTime;
    });

    const averages = document.getElementById('averages');
    averages.innerText = `Average Turnaround Time: ${(totalTAT / preparedProcesses.length).toFixed(2)}\nAverage Waiting Time: ${(totalWT / preparedProcesses.length).toFixed(2)}`;
}
