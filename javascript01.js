

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
    let currentTime = 0;
    let queue = [];
    let ganttChart = [];
    let remainingProcesses = [...preparedProcesses];  // Create a copy to track unfinished processes
    
    while (remainingProcesses.some(p => p.remainingTime > 0)) {
        // Add newly arrived processes to queue
        remainingProcesses.forEach(p => {
            if (p.arrivalTime <= currentTime && !queue.includes(p) && p.remainingTime > 0) {
                queue.push(p);
            }
        });

        if (queue.length === 0) {
            currentTime++;
            continue;
        }

        // Get next process from queue
        let currentProcess = queue.shift();
        
        // Calculate execution time for this quantum
        let execTime = Math.min(quantum, currentProcess.remainingTime);
        
        // Update Gantt chart
        ganttChart.push({
            pid: currentProcess.pid,
            execTime: execTime,
            startTime: currentTime,
            endTime: currentTime + execTime
        });
        
        // Update process times
        currentTime += execTime;
        currentProcess.remainingTime -= execTime;
        
        // If process is complete, calculate its metrics
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
