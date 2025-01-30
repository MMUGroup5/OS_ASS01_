

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

/**
 * Adds a new process row to the process table when the "Add Process" button is clicked.
 * Each process row contains three input fields for arrival time, burst time, and priority.
 * The process ID is assigned incrementally from 0.
 */
function addProcess() {
    // Get the process table element
    const table = document.getElementById('processTable');

    // Insert a new row at the end of the table
    const row = table.insertRow();

    // Assign a unique process ID to the new process
    const pid = processes.length;

    // Create input fields for arrival time, burst time, and priority
    const arrivalInput = document.createElement('input');
    const burstInput = document.createElement('input');
    const priorityInput = document.createElement('input');

    // Set the input types and minimum values
    arrivalInput.type = burstInput.type = priorityInput.type = 'number';
    arrivalInput.min = burstInput.min = priorityInput.min = '0';

    // Create table cells and add the input fields to them
    row.insertCell(0).innerText = `P${pid}`; // Process ID
    row.insertCell(1).appendChild(arrivalInput); // Arrival time
    row.insertCell(2).appendChild(burstInput); // Burst time
    row.insertCell(3).appendChild(priorityInput); // Priority

    // Add the new process to the global 'processes' array
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

/**
 * Runs the Round Robin (RR) CPU scheduling algorithm with the prepared processes and time quantum.
 * @param {Object[]} preparedProcesses - An array of objects with process details (pid, arrivalTime, burstTime, priority, remainingTime, completionTime, turnaroundTime, waitingTime).
 * @param {number} quantum - The time quantum value for the RR algorithm.
 */
function runRoundRobin(preparedProcesses, quantum) {
    let currentTime = 0; // Current simulation time
    let queue = []; // Processes waiting to be executed
    let ganttChart = []; // Gantt Chart data (for visualization)
    let remainingProcesses = [...preparedProcesses];  // Create a copy to track unfinished processes

    /**
     * Loop until all processes have completed their execution.
     * At each iteration, check if any new processes have arrived, and add them to the queue.
     * If no processes are ready, increment time and continue.
     * Otherwise, select the next process from the queue, execute it for the quantum time,
     * and update process times and metrics.
     */
    while (remainingProcesses.some(p => p.remainingTime > 0)) {
        // Add newly arrived processes to queue
        remainingProcesses.forEach(p => {
            if (p.arrivalTime <= currentTime && !queue.includes(p) && p.remainingTime > 0) {
                queue.push(p);
            }
        });

        // If no processes are ready, increment time and continue
        if (queue.length === 0) {
            currentTime++;
            continue;
        }

        // Get next process from queue
        let currentProcess = queue.shift();
        /**
         * Calculate the execution time for this quantum.
         * If the process has remaining time less than or equal to the quantum, execute it completely.
         * Otherwise, execute it for the quantum time.
         */
        let execTime = Math.min(quantum, currentProcess.remainingTime);
        /**
         * Update Gantt chart with the executed process.
         * Create a new object with the process ID, execution time, start time, and end time.
         */
        ganttChart.push({
            pid: currentProcess.pid,
            execTime: execTime,
            startTime: currentTime,
            endTime: currentTime + execTime
        });
        /**
         * Update process times and metrics.
         * Increment the current time by the execution time.
         * Decrement the remaining time of the current process by the execution time.
         * If the process is complete, calculate its metrics (completion time, turnaround time, waiting time).
         */
        currentTime += execTime;
        currentProcess.remainingTime -= execTime;
        
        if (currentProcess.remainingTime === 0) {
            currentProcess.completionTime = currentTime;
            currentProcess.turnaroundTime = currentProcess.completionTime - currentProcess.arrivalTime;
            currentProcess.waitingTime = currentProcess.turnaroundTime - currentProcess.burstTime;
        } else {
            // If process isn't complete, add it back to queue
            // But first, check if any new processes have arrived
            remainingProcesses.forEach(p => {
                if (p.arrivalTime <= currentTime && !queue.includes(p) && p.remainingTime > 0 && p !== currentProcess) {
                    queue.push(p);
                }
            });
            queue.push(currentProcess);
        }
    }

    // Display results
    displayResults(preparedProcesses, ganttChart);
}


function runSrt(preparedProcesses) {
    let currentTime = 0; // Current simulation time
    let completed = 0; // Number of completed processes
    let readyQueue = []; // Processes ready for execution
    let ganttChart = []; // Gantt Chart data

    // Sort processes by arrival time initially
    preparedProcesses.sort((a, b) => a.arrivalTime - b.arrivalTime);

    while (completed < preparedProcesses.length) {
        // Add processes that have arrived to the ready queue
        preparedProcesses.forEach(p => {
            if (p.arrivalTime <= currentTime && !readyQueue.includes(p) && p.remainingTime > 0) {
                readyQueue.push(p);
            }
        });

        // If no processes are ready, increment time and continue
        if (readyQueue.length === 0) {
            currentTime++;
            continue;
        }

        // Find the process with the shortest remaining time in the ready queue
        readyQueue.sort((a, b) => a.remainingTime - b.remainingTime);
        let process = readyQueue[0]; // Process with shortest remaining time

        // Determine how long to execute this process
        let execTime = process.remainingTime;
        if (preparedProcesses.some(p => p.arrivalTime > currentTime && p.arrivalTime < currentTime + process.remainingTime)) {
            // Check if a new process arrives before this process can finish
            let nextArrival = preparedProcesses
                .filter(p => p.arrivalTime > currentTime)
                .sort((a, b) => a.arrivalTime - b.arrivalTime)[0];
            execTime = nextArrival.arrivalTime - currentTime;
        }

        // Execute the process for the determined time slice
        ganttChart.push({
            pid: process.pid,
            execTime,
            startTime: currentTime,
            endTime: currentTime + execTime,
        });

        // Update process metrics
        currentTime += execTime;
        process.remainingTime -= execTime;

        if (process.remainingTime === 0) {
            // If the process is completed, calculate metrics and remove it from the ready queue
            process.completionTime = currentTime;
            process.turnaroundTime = process.completionTime - process.arrivalTime;
            process.waitingTime = process.turnaroundTime - process.burstTime;
            readyQueue.shift(); // Remove the process from the ready queue
            completed++;
        }
    }

    // Display the results
    displayResults(preparedProcesses, ganttChart);
}

function runSjn(preparedProcesses) {
    let currentTime = 0; // Current simulation time
    let completed = 0; // Number of completed processes
    let ganttChart = []; // Gantt Chart data
    let readyQueue = []; // Processes ready for execution

    // Sort the processes by arrival time initially
    preparedProcesses.sort((a, b) => a.arrivalTime - b.arrivalTime);

    while (completed < preparedProcesses.length) {
        // Add processes that have arrived to the ready queue
        preparedProcesses.forEach(p => {
            if (p.arrivalTime <= currentTime && !readyQueue.includes(p) && p.remainingTime > 0) {
                readyQueue.push(p);
            }
        });

        // If no processes are ready, increment time and continue
        if (readyQueue.length === 0) {
            currentTime++;
            continue;
        }

        // Find the process with the shortest remaining time in the ready queue
        readyQueue.sort((a, b) => a.remainingTime - b.remainingTime);
        let process = readyQueue[0]; // Process with shortest remaining time

        // Execute the process for its remaining burst time
        let execTime = process.remainingTime;

        // Log the execution in the Gantt Chart
        ganttChart.push({
            pid: process.pid,
            execTime,
            startTime: currentTime,
            endTime: currentTime + execTime,
        });

        // Update process metrics
        currentTime += execTime;
        process.remainingTime -= execTime;

        if (process.remainingTime === 0) {
            // If the process is completed, calculate metrics
            process.completionTime = currentTime;
            process.turnaroundTime = process.completionTime - process.arrivalTime;
            process.waitingTime = process.turnaroundTime - process.burstTime;
            completed++;
        }
        
        // Remove completed process from readyQueue
        readyQueue = readyQueue.filter(p => p.remainingTime > 0);
    }

    // Display results
    displayResults(preparedProcesses, ganttChart);
}


function runPriority(preparedProcesses) {
    let currentTime = 0;
    let completed = 0;
    let ganttChart = [];
    let readyQueue = [];

    while (completed < preparedProcesses.length) {
        // Filter processes that have arrived and are not yet completed
        readyQueue = preparedProcesses.filter(p => p.arrivalTime <= currentTime && p.remainingTime > 0);

        if (readyQueue.length === 0) {
            // If no processes are ready, increment time
            currentTime++;
            continue;
        }

        // Sort ready processes by priority (ascending), breaking ties by arrival time
        readyQueue.sort((a, b) => a.priority - b.priority || a.arrivalTime - b.arrivalTime);

        // Select the process with the highest priority
        let process = readyQueue[0];

        // Execute the process completely
        let execTime = process.remainingTime;
        ganttChart.push({ 
            pid: process.pid, 
            execTime, 
            startTime: currentTime, 
            endTime: currentTime + execTime 
        });
        currentTime += execTime;

        // Update process details
        process.remainingTime = 0;
        process.completionTime = currentTime;
        process.turnaroundTime = process.completionTime - process.arrivalTime;
        process.waitingTime = process.turnaroundTime - process.burstTime;

        // Increment the count of completed processes
        completed++;
    }

    // Display results
    displayResults(preparedProcesses, ganttChart);
}

function displayResults(preparedProcesses, ganttChart) {
    // Clear the Gantt chart container
    const ganttDiv = document.getElementById('ganttChart');
    ganttDiv.innerHTML = ''; // Clear previous Gantt chart

    // Create a row for the Gantt chart blocks
    const blocksRow = document.createElement('div');
    blocksRow.style.display = 'flex';
    blocksRow.style.marginBottom = '10px';

    ganttChart.forEach((block) => {
        const processDiv = document.createElement('div');
        processDiv.style.flex = block.execTime; // Relative width based on execution time
        processDiv.style.border = '1px solid black';
        processDiv.style.textAlign = 'center';
        processDiv.style.padding = '5px';
        processDiv.style.backgroundColor = '#ddd';
        processDiv.innerHTML = `P${block.pid}`;
        blocksRow.appendChild(processDiv);
    });

    // Add the blocks row to the Gantt chart container
    ganttDiv.appendChild(blocksRow);

    // Create a row for the time labels
    const timeLabelsRow = document.createElement('div');
    timeLabelsRow.style.display = 'flex';
    timeLabelsRow.style.position = 'relative'; // Position labels within the same container

    // Add the starting time label (0)
    let currentTime = 0; // Start from 0
    ganttChart.forEach((block) => {
        // Time label for the start of each block
        const timeDiv = document.createElement('div');
        timeDiv.style.flex = block.execTime; // Matches the width of the corresponding block
        timeDiv.style.textAlign = 'left'; // Align left for proper label placement
        timeDiv.innerHTML = currentTime;
        timeLabelsRow.appendChild(timeDiv);

        // Update current time to the end time of this block
        currentTime += block.execTime;
    });

    // Add the time labels row to the Gantt chart container
    ganttDiv.appendChild(timeLabelsRow);

    // Create a separate row for the final time label (placed in the gaps)
    const endTimeRow = document.createElement('div');
    endTimeRow.style.display = 'flex';
    endTimeRow.style.marginTop = '10px'; // Add some space from the blocks
    endTimeRow.style.justifyContent = 'flex-end'; // Align to the right

    const endTimeDiv = document.createElement('div');
    endTimeDiv.style.position = 'relative';
    endTimeDiv.style.textAlign = 'center'; // Align label to the center of its position
    endTimeDiv.style.flex = '0'; // No gap
    endTimeDiv.innerHTML = currentTime;

    // Append the final time label
    endTimeRow.appendChild(endTimeDiv);

    // Add the end time row to the Gantt chart container
    ganttDiv.appendChild(endTimeRow);

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