//Measure how long it takes to render the DOM
// Create a new PerformanceObserver to monitor the "navigation" performance entry type.
const observer = new PerformanceObserver((list) => {
  // Get the first entry in the list. This will be the most recent navigation event.
  const entry = list.getEntries()[0];
  // Calculate the time it took for the DOM to load.
  const domLoadTime = Math.ceil(entry.duration);
  // Log the time to the console.
  console.log(
    `It took ${domLoadTime} milliseconds to load the trace without formatting.`
  );
});

// Start observing the "navigation" performance entry type.
observer.observe({ type: "navigation" });

var table = findTable();

//If no table exists that potentially contains trace info, throw an error
if (table == undefined) {
  //If we are on the trace overview page replace the link with a clear button
  replaceClearButton();

  throw new Error(
    "Traceformatter has stopped: No table found that can be formatted"
  );
}

var tl = table.rows.length;

//Declare a variable to store all buttonids for collapse / uncollapse all action
var buttonids = [];

//Ranking of all rows sorted from slowest to fastest
var performanceranking = [];

//Ranking of all rows sorted from most frequent to least popular
var popularranking = [];

// When this code has already been executed a lot of it does not have to be executed again.
var lazymode = false;

//Has the traceformatter already run and is there an arry with button IDs stored?
var arrayEl = document.getElementById("buttonIdsElement");

if (arrayEl != null) {
  let butttonIDsString = arrayEl.getAttribute("data-array");
  buttonids = JSON.parse(butttonIDsString);
  //When reopening a saved and formatted trace, lazymode is turned on
  lazymode = buttonids.length > 0 ? true : false;
}

//Skip adding the buttons when they are already present
if (!lazymode) {
  //Add buttons to the DOM
  var node = document.createElement("div");
  node.id = "buttonwrapper";

  var button0 = document.createElement("button");
  button0.id = "JumptoError";
  button0.style.display = "none";
  button0.textContent = "Jump to error 🚨";

  var button1 = document.createElement("button");
  button1.id = "JumpToSlowest";
  button1.style.display = "none";
  button1.textContent = "Jump to slowest 🐌";

  var button2 = document.createElement("button");
  button2.id = "collapseAll";
  button2.style.display = "none";
  button2.className = "collapse";
  button2.textContent = "▼ Collapse All";

  var button3 = document.createElement("button");
  button3.id = "buttontrigger";
  button3.textContent = "Enable Collapsing";

  var button4 = document.createElement("button");
  button4.id = "topten";
  button4.textContent = "Top twenty slowest 🥇";

  var button5 = document.createElement("button");
  button5.id = "mostpopular";
  button5.style.display = "none";
  button5.textContent = "Most popular 📸";

  var button6 = document.createElement("button");
  button6.id = "feedback";
  button6.textContent = "Feedback 💌";

  var buttonIdsElement = document.createElement("div");
  buttonIdsElement.id = "buttonIdsElement";

  node.appendChild(button3);
  node.appendChild(button2);
  node.appendChild(button0);
  node.appendChild(button1);
  node.appendChild(button4);
  node.appendChild(button5);
  node.appendChild(button6);
  node.appendChild(buttonIdsElement);

  document.body.insertBefore(node, document.body.firstChild);

  //Add the progress bar to the DOM
  // Create the container element
  const container = document.createElement("div");
  container.classList.add("progress-bar-container");

  // Create the progress bar element
  const progressBar = document.createElement("div");
  progressBar.classList.add("progress-bar");
  progressBar.style.width = 0;

  // Append the progress bar to the container
  container.appendChild(progressBar);

  // Insert the container into the document body
  document.body.appendChild(container);

  // Add line numbers to the rows of the trace content table
  addLineNumbers();

  //Prevent extreme horizontal widths when cells have a lot of content like long SQL queries
  applyDefaultColumnWidth();
}

// Get the progress bar element
const progressBar = document.querySelector(".progress-bar");

// Set the initial number of steps
var numStepsFinished = 0;

//Is initialized as 0. Is set to the number of batches that are created in
var totalNumSteps;

//Add eventlisteners as functions cannot be called from the buttons themselves. The buttons are on the DOM and cannot access the scope of this .js file
document.getElementById("JumptoError").addEventListener("click", jumpToError);
document
  .getElementById("JumpToSlowest")
  .addEventListener("click", jumpToSlowest);
document
  .getElementById("buttontrigger")
  .addEventListener("click", scanTableFindMatchesAddButtons);
document
  .getElementById("collapseAll")
  .addEventListener("click", toggleCollapseExpandAll);
document
  .getElementById("topten")
  .addEventListener("click", plotPerformanceTable);
document
  .getElementById("mostpopular")
  .addEventListener("click", plotPopularTable);

document.getElementById("feedback").addEventListener("click", openFeedbackMail);

//Store all tables of the trace in an array
const tables = document.querySelectorAll(".tracecontent>table");

//Hide tables below the trace that are not required for most trace analysis
if (hasTablesTooHide()) {
  if (!lazymode) {
    hideTables();

    //Add a button to make them reappear if needed
    addHideTableButton();
  }
  document.getElementById("hideTables").addEventListener("click", hideTables);
}

//Add buttons automatically if there are less than 30.000 rows
//Adding buttons automatically for larger tables could otherwise lead to undesirable loading times
if (tl < 30000 && !lazymode) {
  scanTableFindMatchesAddButtons();
}

if (lazymode) {
  //Re-apply all eventlisteners to all starting and finishing elements
  for (i = 0; i < buttonids.length; i++) {
    var row = document.getElementById("s" + buttonids[i]);
    row.addEventListener("click", toggleCollapseWrapper2);
  }
  console.log(
    "Finished re-applying eventlisteners to all buttons for collapsing/expanding"
  );
}

// FUNCTIONS ----------------------------------------------------------------

function openFeedbackMail() {
  var email = "traceformatter@joachimbatzke.com";
  var subject = "Feedback";
  var body =
    "Dear Trace Formatter Team,\n\nI would like to provide the following feedback:\n\n";

  // Encode the email subject and body to be included in the mailto URL
  var encodedSubject = encodeURIComponent(subject);
  var encodedBody = encodeURIComponent(body);

  // Generate the mailto URL with the pre-filled subject and body
  var mailtoUrl =
    "mailto:" + email + "?subject=" + encodedSubject + "&body=" + encodedBody;

  // Open the default email client with the pre-filled content
  window.location.href = mailtoUrl;
}

//Find the table the contains the actual trace data
function findTable() {
  var tableID = "trace-table";

  //Try to find the actual trace content. The id only exists if it has been set by an earlier formatting so in most case it will be undefined
  var t = document.getElementById(tableID);

  if (!(t == undefined)) {
    return t;
  }

  //The second table of an unformatted trace contains the actual trace info.
  t = document.getElementsByTagName("table")[1];

  if (t == undefined) {
    return undefined;
  }

  if (!t.rows[0].textContent.includes("Trace")) {
    return undefined;
  }

  //Set the id so the the next traceformatter can find the table immediatly
  t.id = tableID;

  return t;
}

//Replaces the "Clear all current trace data" link with a button that clears the trace data.
function replaceClearButton() {
  var newBtnId = "clear-trace-btn";

  var btn = document.getElementById(newBtnId);

  if (btn) {
    return;
  }

  var existingLink = document.querySelector(
    ".tracecontent td .link"
  ).parentElement;

  if (existingLink) {
    var newButton = document.createElement("button");
    newButton.setAttribute(
      "onclick",
      "window.location.href='Trace.axd?clear=1'"
    );
    newButton.setAttribute("class", "clear-button");
    newButton.id = "clear-trace-btn";
    newButton.innerHTML = "Clear all current trace data 🗑️";

    var newTd = document.createElement("td");
    newTd.appendChild(newButton);

    existingLink.parentNode.replaceChild(newButton, existingLink);
  }
}

//Array to store all pairs
var StartingElements = [];
var FinishElements = [];

//Scan the whole table, find matches between process start and finish elements, then add buttons so they can be collapsed
function scanTableFindMatchesAddButtons(evt) {
  //Step 1: Setup progressbar
  //Step 2: Scanning and matching
  //Step 3: Adding all buttons

  totalNumSteps = 3;

  // ----------- Step 1 ------------//

  console.time("Total formatting");
  document.getElementById("buttontrigger").disabled = true;
  document.getElementById("buttontrigger").innerHTML = "Enabling collapsing";

  if (evt != undefined) {
    var e = evt.target;
    e.disabled = true;
    addSpinner(e);
  }

  finishStep(); //Step 1

  // Nest in a timeout to ensure that the spinner and the loading bar are displayed correctly
  setTimeout(() => {
    // ----------- Step 2 ------------//

    console.time("Scan " + tl + " rows");
    //Scan the whole table and fill the Starting and Finish element
    scanTable(table, 2, tl);
    console.timeEnd("Scan " + tl + " rows");

    console.time("Match " + StartingElements.length + " start and finish rows");
    //find matches between all starting and finishing elements
    findMatches();
    console.timeEnd(
      "Match " + StartingElements.length + " start and finish rows"
    );

    finishStep(); //Step 2

    // Nest in a timeout to ensure that the spinner and the loading bar are displayed correctly
    setTimeout(() => {
      // ----------- Step 3 ------------//

      //Add all buttons based on promises that resolve individually
      addAllButtonsPromise();
      //addButtons(buttonids);

      if (evt != undefined) {
        e.disabled = false;
        removeSpinner(e);
      }
    }, 100); // <-- arbitrary number greater than the screen refresh rate
  }, 10); // <-- arbitrary number greater than the screen refresh rate
}

//Hide the button that enables collapsing, when it is not relevant anymore
function hideTriggerUIShowAllbuttons() {
  document.getElementById("buttontrigger").style.display = "none";
  //If collapsable elements exist, enable the UI elements
  if (buttonids.length < 0) {
    return;
  }
  //show the buttons
  document.getElementById("collapseAll").setAttribute("style", "");
  document.getElementById("JumptoError").setAttribute("style", "");
  document.getElementById("JumpToSlowest").setAttribute("style", "");
  document.getElementById("mostpopular").setAttribute("style", "");
}

function storeButtonIds() {
  // Convert the id array to a string
  let butttonIDsString = JSON.stringify(buttonids);
  // Store the string in a data attribute of a DOM element so they can be reused when the trace is opened again
  document
    .getElementById("buttonIdsElement")
    .setAttribute("data-array", butttonIDsString);
}

//Scan the whole table and fill the global variables with starting and finishing elements
function scanTable(t, from, until) {
  if (t == undefined) {
    console.error("Cannot scan an undefined table.");
    return;
  }
  if (from == null) {
    from = 0;
  }
  if (until == null) {
    until = t.length;
  }
  //Add row ids to "Starting" and "Finish"-elements.
  for (let i = from; i < until; i++) {
    //start from row 2 since the data starts there
    //Current table row element
    var tr = t.rows[i];
    //Second cel in row
    var t1 = tr.cells[1];
    //String in second cell
    var tsinner = t1.innerHTML;

    var isStartingcell = tsinner.indexOf("Starting") > -1;

    if (!isStartingcell) {
      var isFinishcell = tsinner.indexOf("Finished") > -1;

      if (!isFinishcell) {
        continue;
      }
    }

    //Extract and save process id as element id
    var id = getID(tsinner);

    //if the id is not valid, then continue
    if (!(id > 0)) {
      continue;
    }

    if (isStartingcell) {
      //merge row id and process id to unique string
      var sid = "s" + tr.rowIndex + "_" + id;
      //set as element id
      tr.id = sid;
      //create a new StartingElement for the row and the process id. The rowindex of the matching "finish" element is left empty
      var StartingElement = [tr.rowIndex, id, 0];
      //add it to the list of StartingElements
      StartingElements.push(StartingElement);
      continue;
    }

    if (isFinishcell) {
      var FinishElement = [tr.rowIndex, id];
      FinishElements.push(FinishElement);
    }
  }
}

//Get the process ID at the end of a string
function getID(string) {
  var array = string.slice(-10).split("_");
  var last = array.length - 1;
  var id = parseInt(array[last]);
  return id;
}

//Find a matching finishing element for all starting elements
function findMatches() {
  //for each StartingElement in the array
  for (h = 0; h < StartingElements.length; h++) {
    //only if the pair does not have a rowindex for the finish element yet
    if (StartingElements[h][2] != 0) {
      continue;
    }
    //find match for the starting element
    findMatch(StartingElements[h][1]);
  }
}

//Find a matching finishing element for a single starting element
function findMatch(processIdStart) {
  //find the next occurence of a pair with the same process id by searching backwards in the array
  for (i = StartingElements.length - 1; i >= 0; i--) {
    //has another pair been found with the same process id?
    //It should have no row index set for the finish element
    if (
      StartingElements[i][1] != processIdStart ||
      StartingElements[i][2] != 0
    ) {
      continue;
    }

    //this is the last occurence of the process ID in the StartingElements array. We need to find a matching finish element for it now.
    var lastStartingElementrowIndex = StartingElements[i][0];

    for (j = 0; j < FinishElements.length; j++) {
      //Match based on ID found?
      if (processIdStart != FinishElements[j][1]) {
        continue;
      }
      var rowIndexFinishElement = FinishElements[j][0];

      //is the row index of the starting element lower than the one of the finishing element? Or does the potential match appear lower in the list?
      if (lastStartingElementrowIndex >= rowIndexFinishElement) {
        continue;
      }
      //create a unique string for the finish element so that the collapse function can find it
      var fid = "f" + lastStartingElementrowIndex + "_" + processIdStart;

      //set it as the id of the html element
      table.rows[rowIndexFinishElement].id = fid;
      //store the row index of the found finished-element in the pair[]
      StartingElements[i][2] = rowIndexFinishElement;

      /*
      console.log(
                "Match found for process ID '" +
                  StartingElements[i][1] +
                  "' It will collapse from row '" +
                  StartingElements[i][0] +
                  "' until row' " +
                  StartingElements[i][2] +
                  "'"
              );
      */

      //create the unique id
      var buttonid = lastStartingElementrowIndex + "_" + processIdStart;

      //Add the button id to an array that can be used for the AddButtons() function and the "Collapse/Expand all" actions
      buttonids.push(buttonid);

      //A match has been found an correctly processed for FinishElements[j]. Therefore it can be removed from the arrray
      FinishElements.splice(j, 1);

      //Exit the for loop to continue searching for the next StartingElement
      break;

      //when no match was found continue searching until the last item in FinishElements
    }
    //if the row index of the finish element could not be set after looking at all of the relevant FinishElements
    if (
      StartingElements[i][2] == 0 ||
      StartingElements[i][2] == undefined ||
      StartingElements[i][2] == null
    ) {
      console.log(
        "Could not find the finish element for s" +
        StartingElements[i][0] +
        "_" +
        StartingElements[i][1]
      );
      //Get the cell of the failed process and highlight it red
      var unfinishedProcess = document.getElementById(
        "s" + StartingElements[i][0] + "_" + StartingElements[i][1]
      );
      unfinishedProcess.cells[1].style.color = "red";
      //set it to -1 to indicate that nothing was found
      StartingElements[i][2] = -1;
    }
  }
}

//Add all buttons based on the global buttonids variable and split the task in multiple threads
function addAllButtonsPromise() {
  console.time("Add " + buttonids.length + " buttons");

  // Split the array into multiple arrays, each with a maximum of 100 items
  const splitArrays = buttonids.reduce(
    (acc, item) => {
      // If the current array in the accumulator is full, create a new array
      if (acc[acc.length - 1].length === 100) {
        acc.push([]);
      }
      acc[acc.length - 1].push(item);
      return acc;
    },
    [[]]
  );

  //console.log(splitArrays);

  const myPromises = [];

  // Create X new promises
  for (let i = 0; i < splitArrays.length; i++) {
    myPromises.push(
      new Promise((resolve) => {
        //Add a button for each button id in the array
        addButtons(splitArrays[i]);
        //console.log("Finished adding all buttons for splitArray[" + i + ")");
        resolve(true);
      })
    );
  }

  // Execute all of the promises
  Promise.all(myPromises)
    .then(() => {
      console.timeEnd("Add " + buttonids.length + " buttons");
      console.log("All promises resolved");

      allButtonPromisesResolved();
    })
    .catch((error) => {
      console.log(error);
    });
}

function allButtonPromisesResolved() {
  hideTriggerUIShowAllbuttons();
  storeButtonIds();
  finishStep(); //Step 3
  console.timeEnd("Total formatting");
}

//Add multiple buttons based on
function addButtons(array) {
  //Add a button for each button id in the array
  for (let j = 0; j < array.length; j++) {
    addButton(array[j]);
  }
}

//Add a single button to a specific collapsable cell
function addButton(buttonid) {
  //trs = TableRowStartElement
  var trs = document.getElementById("s" + buttonid);
  // Get second cell in the row
  var t1 = trs.cells[1];
  //Separate whitespaces from text by splitting them into 2 span elements
  splitContent(t1, "S");

  var span2 = t1.getElementsByTagName("span")[1];
  span2.classList.add("start");
  //Determine the no of rows to be collapsed
  var rowcount = noOfRows(buttonid);

  //Add an utf8-triangle and the row count to the span element
  span2.innerHTML = `&#9660; ${span2.innerHTML} (${rowcount} rows)`;

  trs.addEventListener("click", toggleCollapseWrapper2);

  //Add anchor at finish elemement to jump to the start at TabelRowFinishCell (trfc)
  var trfc = document.getElementById("f" + buttonid).cells[1];

  splitContent(trfc, "F");

  var fspan2 = trfc.getElementsByTagName("span")[1];

  fspan2.classList.add("finish");

  fspan2.innerHTML = `${fspan2.innerHTML} <a href='#s${buttonid}'>Jump ${rowcount} rows up</a>`;

  //Highlight Success = False
  var successRowIndex = document.getElementById("f" + buttonid).rowIndex + 3;
  //console.log(successRowIndex);

  if (successRowIndex >= table.rows.length) {
    return;
  }

  var successCell = table.rows[successRowIndex].cells[1];

  //console.log(successCell.innerHTML);
  if (successCell.innerHTML.indexOf("alse") > -1) {
    //enable jumpToError()
    successCell.classList.add("error");
  }
}

//Triggers collapseExpandAll() but requires a button event as an input
function toggleCollapseExpandAll(evt) {
  var e = evt.target;

  //disable the button to prevent double clicks
  document.getElementById("collapseAll").disabled = true;

  //set the variable that will be passed to toggleCollapse()
  var collapseExpand = "";

  //If the button is set to collapse all
  if (e.classList.contains("collapse")) {
    collapseExpand = "collapse";
    //Update the button label
    e.innerHTML = "&#9658; Expand all";
  } else {
    //If the button is set to collapse all
    collapseExpand = "expand";
    //Update the button label
    e.innerHTML = " &#9660; Collapse all";
  }

  e.classList.toggle("collapse");

  addSpinner(e);

  collapseExpandAll(collapseExpand);
}

//Collapse or expand all rows of the table. Input is either the string "collapse" or "expand".
function collapseExpandAll(collapseExpand) {
  //Log the total time of collapsing/expanding items
  const timerlabel = collapseExpand + " " + buttonids.length;
  +" items";
  console.time(timerlabel);

  //Collapse from last button to the first one
  if (collapseExpand == "collapse") {
    collapseAllBatched();
    console.timeEnd(timerlabel);
    return;
  }

  //Expand from first button to the last one
  else if (collapseExpand == "expand") {
    expandAllBatched();
    console.timeEnd(timerlabel);
    return;

  }
}

//Collapse all buttons one by one in batches. For each finished batch the progressbar will be updated
function collapseAllBatched() {
  var bl = buttonids.length;
  //Batchsize. After every x togglecollapse() actions the progress bar will be updated
  var batchSize = 100;
  //Max number of steps the progress bar will have
  totalNumSteps = Math.round(bl / batchSize);

  var batchIndex = 0;
  var batchCount = Math.ceil(bl / batchSize);
  var l = bl - 1;

  var collapseBatchLoop = function () {
    for (var i = 0; i < batchSize && l >= 0; i++, l--) {
      toggleCollapse(buttonids[l], "collapse");
    }
    finishStep();
    batchIndex++;
    if (batchIndex < batchCount) {
      //Trigger next batch in 0 ms
      setTimeout(collapseBatchLoop, 0);
    } else {
      //All batches finished
      enableButton("collapseAll");
      return;
    }
  };

  //Intialize recursion
  collapseBatchLoop();
}

//Expand all rows of the "table" quickly
function expandAllBatched() {
  let from = 2;
  let batchSize = 2000;
  let batchCount = Math.ceil(tl / batchSize);
  var batchIndex = 0;

  //Max number of steps the progress bar will have
  totalNumSteps = batchCount;
  switchTrianglesExpand();

  var expandBatchLoop = function () {
    var batchfrom = from + batchIndex * batchSize;
    var batchuntil = batchfrom + batchSize;
    expandRows(batchfrom, batchuntil);
    finishStep();
    batchIndex++;
    if (batchIndex < batchCount) {
      //Trigger next batch in 0 ms
      setTimeout(expandBatchLoop, 0);
    } else {
      //All batches finished
      enableButton("collapseAll");
      return;
    }
  };

  //Intialize recursive function
  expandBatchLoop();
}

//Expand all rows quickly regardless whether they are already collapsed or not
function expandRows(from, until) {
  if (until > tl) {
    until = tl;
  }
  for (i = from; i < until; i++) {
    table.rows[i].classList.remove("hidden");
  }
}

//Switch the triangles
function switchTrianglesExpand() {
  console.log("Startingelements: " + StartingElements.length);
  for (i = 0; i < StartingElements.length; i++) {
    var startcell =
      table.rows[StartingElements[i][0]].cells[1].querySelector("span.start");
    startcell.innerHTML = "&#9660;" + startcell.innerHTML.slice(1);
    startcell.parentElement.parentElement.classList.remove("collapsed");
  }
}

//Enable the button again
function enableButton(id) {
  var btn = document.getElementById(id);
  if (btn == null || btn.disabled == false) {
    return;
  }
  btn.disabled = false;
  removeSpinner(btn);
}

//Trigger toggleCollapse() for button eventlisteners
function toggleCollapseWrapper(evt) {
  var id = evt.target.id;
  if (id === null || id === undefined || id === "") {
    return;
  }

  toggleCollapse(id);
}

//Trigger toggleCollapse() for table row eventlisteners
function toggleCollapseWrapper2(evt) {
  //console.log(evt.target);
  var id = evt.target.parentElement.id;

  if (id == "") {
    id = evt.target.parentElement.parentElement.id;
  }
  id = id.slice(1);
  //console.log(id);
  toggleCollapse(id);
}

//Collapse or expand rows
function toggleCollapse(id, collapseExpand) {

  if (id === null || id === undefined || id === "") {
    return;
  }

  var sid = "s" + id;
  var start = document.getElementById(sid);
  var startcell = start.cells[1].getElementsByTagName("span")[1];
  var startIndex = start.rowIndex;
  var rowcount = noOfRows(id);
  var collapsed = start.classList.contains("collapsed");

  //When the to be enforced option is already the status quo, nothing needs to happen.
  if (
    (collapseExpand == "collapse" && collapsed) ||
    (collapseExpand == "expand" && !collapsed)
  ) {
    //console.log("Collapsing/Expanding was skipped");
    return;
  }
  //If elements need to be hidden
  if (!collapsed) {
    collapse(startcell, rowcount, startIndex, start);

    return;
  }

  //If elements need to be shown again
  if (collapsed) {
    expand(start, startcell, rowcount, startIndex);
  }
}

//expand cells for a single startcell
function expand(start, startcell, rowcount, startIndex) {
  //Show the start element again in case it was hidden
  start.classList.remove("hidden");
  //switch the triangle
  startcell.innerHTML = "&#9660;" + startcell.innerHTML.slice(1);
  //loop through all rows that should become visible again
  for (m = 1; m <= rowcount; m++) {
    //Current table row element
    var tr = table.rows[startIndex + m];
    //if the row is another starting row with collapsed children
    //Remove the class and therefore show the row again
    tr.classList.remove("hidden");

    if (tr.classList.value.indexOf("collapsed") > -1) {
      //console.log("Will skip " + noOfRows(tr.id.substring(1)) + " rows at " + m);
      //inrease m so that all children of that collapsed row wont be uncollapsed but skipped
      m = m + noOfRows(tr.id.substring(1));
    }
  }
  start.classList.remove("collapsed");
}

//collapse rows for a single startcell
function collapse(startcell, rowcount, startIndex, start) {
  //switch the triangle
  startcell.innerHTML = "&#9658;" + startcell.innerHTML.slice(1);

  for (k = 1; k <= rowcount; k++) {
    //Current table row element
    var tr = table.rows[startIndex + k];

    //hide the row
    tr.classList.add("hidden");

    //if the row is another starting row with collapsed children
    if (tr.classList.value.indexOf("collapsed") > -1) {
      //console.log("Will skip " + noOfRows(tr.id.substring(1)) + " rows at" + k);
      //inrease k so that the children wont be collapsed again but skipped
      k = k + noOfRows(tr.id.substring(1));
      //console.log("Increased k to  " + k +" because of " + tr.id);
    }
    //console.log("For id: " + id + " finished loop " + k + " of " + rowcount          );
  }
  start.classList.add("collapsed");
}

//Count the number of rows that are between a start and a finish element
function noOfRows(id) {
  var sid = "s" + id;
  var fid = "f" + id;

  //get start and finish element
  var start = document.getElementById(sid);
  var finish = document.getElementById(fid);

  if (start == null || finish == null) {
    return undefined;
  }

  //get positions
  var startIndex = start.rowIndex;
  var finishIndex = finish.rowIndex;

  var noOfRows = finishIndex - startIndex ?? 0;

  if (noOfRows <= 0) {
    console.log("Something is messed up with sid " + sid + " and fid " + fid);
    return 0;
  }
  return noOfRows;

}

// Scroll to the position of the slowest row, triggered by the dedicated button
function jumpToSlowest(evt) {
  //The button that triggered the function
  var e = evt.target;
  //disable the trigger element to prevent double clicks
  e.disabled = true;
  //Add a spinner to indicate loading
  addSpinner(e);

  setTimeout(() => {
    //If no max value has been identified yet and the process didn't run yet
    if (performanceranking[0] == undefined) {
      performanceranking = getRanking();
    }

    //Jump to item with postion 0 => slowest
    jumpToSlowPos(0);

    e.disabled = false;
    removeSpinner(e);
  }, 20); // <-- arbitrary number greater than the screen refresh rate
}

//Scroll to the position of a slow row triggered by the link in the plotted performance table
function jumpToSlowRow(evt) {
  var trigger = evt.target;
  var pos =
    parseInt(trigger.parentElement.parentElement.cells[0].innerText) - 1;
  jumpToSlowPos(pos);
}

//Highlight slow process actions by applying a gradiant color to the last cell and then jumping to the slowest one
function jumpToSlowPos(pos) {
  //Expand all rows first so that the slow row will be visible with 100% certanty
  collapseExpandAll("expand");

  var posid = performanceranking[pos][1];

  slowposEl = document.getElementById(posid);

  jumpToId(posid, slowposEl.parentElement);
}

//Jump to a specific starting element based on the "data-sid" id that is linhked to the trigger element
function jumpToTriggerSid(evt) {
  var trigger = evt.target;
  var tr = trigger.parentElement.parentElement;
  var sid = tr.getAttribute("data-sid");
  var pos = parseInt(trigger.parentElement.parentElement.cells[0].innerText);

  //Expand all rows first so that the slow row will be visible with 100% certanty
  collapseExpandAll("expand");

  var newSid = "";

  if (
    !trigger.classList.contains("prev") &&
    !trigger.classList.contains("next")
  ) {
    newSid = popularranking[pos].sids[0];
  }

  if (trigger.classList.contains("prev")) {
    newSid = getPrevsid(pos, sid);
  }

  if (trigger.classList.contains("next")) {
    newSid = getNextsid(pos, sid);
  }
  tr.setAttribute("data-sid", newSid);
  jumpToId(newSid);
}

//Jump to a specific starting element based on the starting id (sid)
function jumpToId(id, flashElement) {
  var el = document.getElementById(id);

  //if a pos-id has been passed, jump to th parent tr instead of the td
  if (id.indexOf("pos") > -1) {
    el = el.parentElement;
  }
  //Overwrite if empty
  var flashElement = flashElement || el;

  el.scrollIntoView({
    block: "center",
  });

  //Shortly higlight the row
  addFlash(flashElement);
}

//Fill the newranking array with sorted values based the time it took for a row to be executed according to the trace
function getRanking() {
  var td;
  var float = 0.0;
  var fraction = 0.0;
  var position = [];
  var posID;
  var newranking = [];

  //start from row 3 since the data starts there
  for (var i = 3; i < table.rows.length; i++) {
    //get the cell of the column "from last(s)"
    td = table.rows[i].cells[3];

    //Parse the string to a float
    float = parseFloat(td.innerHTML.replace(",", ".").replace(" ", ""));

    //Increase the fraction/opacity by 10 so that an action that takes 100ms will become 100% orange
    fraction = float * 10;

    applyPerformanceStyle(td, fraction);

    posID = "pos-" + i;
    //Give th the id of the cell position
    td.id = posID;
    //add the current float to an array together with the id of the element to be able to retrieve it later
    position = [float, posID];
    //add the current position to the ranking
    newranking.push(position);
  }

  //Sort the ranking array desc by float
  newranking.sort(function (a, b) {
    return b[0] - a[0];
  });

  return newranking;
}

//let the background of any element flash
function addFlash(el) {
  //Add flash class
  el.classList.add("flash");

  //Reset the animation in case it has already been added earlier
  el.style.animation = "none";
  el.offsetHeight; /* trigger a reflow */
  el.style.animation = null;
}

//Apply the color scale to a table cell depending on a calculated "fraction"
function applyPerformanceStyle(td, fraction) {
  //make font bold
  td.classList.add("performance");

  // if loadtime is 100ms or slower
  if (fraction <= 1) {
    var l = 50 + (50 - fraction * 50);

    td.style.cssText = "background: hsl(38, 100%, " + l + "%)";
  } else {
    //apply a background color (red) if it is slower than 100ms
    td.style.cssText = "background: rgb(255, 0, 0); font-weight: bolder";
    //Also switch to white text-color to ensure readability
    td.style.color = "white";
  }
}

//Plot the slowest process actions in a table
function plotPerformanceTable() {
  var id = "ranking";

  if (toggleTableVisibility(id, false)) {
    //exit if the table has already been plotted
    return;
  }

  //If no max value has been identified yet and therefore getRanking() didn't run yet
  if (performanceranking.length <= 0) {
    performanceranking = getRanking();
  }

  //Declare a new table to display the data from ranking()
  var ptable = document.createElement("table");
  ptable.id = id;

  //Add a table header row
  var pth = ptable.insertRow(-1);
  pth.classList.add("header");
  var h0 = pth.insertCell(-1);
  var h1 = pth.insertCell(-1);
  var h2 = pth.insertCell(-1);

  for (i = 0; i <= 19; i++) {
    var ptr = ptable.insertRow(-1);
    var pcell0 = ptr.insertCell(-1);
    var pcell1 = ptr.insertCell(-1);
    var pcell2 = ptr.insertCell(-1);

    h0.innerHTML = "Pos.";
    h1.innerHTML = "Seconds";
    h2.innerHTML = "Slow Processes";

    pcell0.innerHTML = i + 1 + ".";
    pcell1.innerHTML = performanceranking[i][0];

    var ael = document.createElement("a");
    ael.innerHTML = document
      .getElementById(performanceranking[i][1])
      .parentElement.cells[1].innerText.trim()
      .slice(0, 70);
    ael.addEventListener("click", jumpToSlowRow);
    pcell2.appendChild(ael);
  }
  document.body.insertBefore(ptable, document.body.firstChild);

  hideDifferentTable(id);
}

//Plot the most frequent process actions
function plotPopularTable() {
  var id = "popular";

  if (toggleTableVisibility(id, false)) {
    //exit if the table has already been plotted
    return;
  }

  //Update the global variable of the popularity based on all starting elements
  popularranking = countAndSortIds(StartingElements);

  //Declare a new table + headers to display the data from countAndSortIds()
  var poptable = document.createElement("table");
  poptable.id = id;

  //Add a table header row
  var pth = poptable.insertRow(-1);
  pth.classList.add("header");
  var h0 = pth.insertCell(-1);
  var h1 = pth.insertCell(-1);
  var h2 = pth.insertCell(-1);
  var h3 = pth.insertCell(-1);
  var h4 = pth.insertCell(-1);

  h0.innerText = "Hidden Array Position";
  h0.style.display = "none";
  h1.innerText = "Freq.";
  h2.innerText = "Took (ms)";
  h3.innerText = "Popular Processes";
  h4.innerText = "Prev/Next";

  let l = popularranking.length - 1;

  for (let i = 0; i <= 19 && i < l; i++) {
    var ptr = poptable.insertRow(-1);
    var pcell0 = ptr.insertCell(-1);
    var pcell1 = ptr.insertCell(-1);
    var pcell2 = ptr.insertCell(-1);
    var pcell3 = ptr.insertCell(-1);
    var pcell4 = ptr.insertCell(-1);

    var count = popularranking[i].count;

    //Get the first sid of the current process id
    var sid = popularranking[i].sids[0];
    //add the data attribute to enable navigation later
    ptr.setAttribute("data-sid", sid);

    pcell0.innerText = i;
    pcell0.style.display = "none";
    pcell1.innerText = count;
    pcell1.classList.add("freq");

    pcell2.innerText = popularranking[i].took;
    pcell2.classList.add("took");

    //Add a clickable link
    var ael = document.createElement("a");
    ael.innerText = document
      .querySelector("#" + sid + " .start")
      .innerText.trim()
      .slice(19, 70);
    ael.addEventListener("click", jumpToTriggerSid);
    pcell3.appendChild(ael);

    //If there are multiple occurences, add UI for navigating
    if (count > 1) {
      //Build a previous button
      var prev = document.createElement("span");
      prev.classList.add("prev");
      prev.innerText = "▲";
      prev.addEventListener("click", jumpToTriggerSid);
      pcell4.appendChild(prev);

      //Build a next button
      var next = document.createElement("span");
      next.classList.add("next");
      next.innerText = "▼";
      next.addEventListener("click", jumpToTriggerSid);
      pcell4.appendChild(next);
    }
  }
  document.body.insertBefore(poptable, document.body.firstChild);

  hideDifferentTable(id);
}

//Get the sid of the previous element
function getPrevsid(pos, sid) {
  var sids = popularranking[pos].sids;
  let l = sids.length - 1;

  for (let i = 0; i <= l; i++) {
    if (sids[i] != sid) {
      continue;
    }

    //store the previous sid
    var prevsid = sids[i - 1];

    //the previous sid does not exist?
    if (prevsid == null) {
      //return the last sid of the list
      return sids[l];
    }
    //return the previous sid
    return prevsid;
  }
}

//Get the sid of the next element
function getNextsid(pos, sid) {
  var sids = popularranking[pos].sids;
  let l = sids.length - 1;

  for (i = 0; i <= l; i++) {
    if (sids[i] != sid) {
      continue;
    }

    //store the next sid
    var nextsid = sids[i + 1];

    //the previous sid does not exist?
    if (nextsid == null) {
      //return the first sid of the list
      return sids[0];
    }
    //return the next sid
    return nextsid;
  }
}

//Toggle the visibility of an HTML element with the given ID
function toggleTableVisibility(id, forceHide = false) {
  //Get the html element
  var el = document.getElementById(id);

  //If the element does not exist yet on the DOM
  if (el == null) {
    return (exists = false);
  }

  //should be hidden
  if (forceHide) {
    el.classList.add("hidden");
    return (exists = true);
  }

  //toggle the visibility
  el.classList.toggle("hidden");

  if (el.classList.contains("hidden")) {
    //Do nothing if the element has been hidden
    return (exists = true);
  }

  hideDifferentTable(id);
  return (exists = true);
}

//Hide the table(s) that have an id differnt from the input. Only works for "ranking" and "popular" for now
function hideDifferentTable(id) {
  //hide the other element with a different ID
  if (id == "ranking") {
    toggleTableVisibility("popular", true);
  } else {
    toggleTableVisibility("ranking", true);
  }
}

//Count the occurence of process ids in the array and sort by popularity
function countAndSortIds(arr) {
  // Create an object to store the count of each id
  const idCounts = {};

  // Loop through the input array
  for (let i = 0; i < arr.length; i++) {
    // Get the id from the current array
    const id = arr[i][1];
    // If the id is not yet in the idCounts object, add it with a count of 1
    if (!idCounts[id]) {
      idCounts[id] = 1;
    } else {
      // If the id is already in the idCounts object, increment its count by 1
      idCounts[id]++;
    }
  }

  // Create an array of objects to store the ids and their counts
  const idArray = [];
  // Loop through the idCounts object
  for (const id in idCounts) {
    // Push an object with the id and count into the idArray
    idArray.push({ processid: id, count: idCounts[id] });
  }

  // Sort the idArray in descending order based on the count of each id
  idArray.sort((a, b) => b.count - a.count);

  //Get all element ids that match the processid. These will help to navigate to elements in the DOM later
  const sidArray = addSidToSortedArray(idArray);

  // Return the sorted with sids
  return sidArray;
}

//Add the sids of all processes to the sorted array to enable navigation between them
function addSidToSortedArray(array) {
  // Loop through the StartingElements array
  for (let i = 0; i < StartingElements.length; i++) {
    let rowIndex = StartingElements[i][0];
    let processId = StartingElements[i][1];

    let processIndex = -1;

    // Loop through the array to check if the processId already exists
    for (let j = 0; j < array.length; j++) {
      if (array[j].processid == processId) {
        processIndex = j;
        break;
      }
    }

    // If the processId of StartingElements doesn't exist in the trigger array, skip to the next processId
    if (processIndex === -1) {
      //console.log(processId + " not found in input array");
      continue;
    }

    //Calculate the button id by merging the rowIndex and processId
    let buttonId = rowIndex + "_" + processId;

    //Get the amount of ms it took for process to finish
    var tookXXms = parseFloat(getTook(buttonId));

    // Ensure that a TOOK element to calculate the sum of the time that it took to execute all instances of a process
    if (array[processIndex].took == null) {
      array[processIndex].took = tookXXms;
    } else {
      //New sum. Use extra parsing to a float to prevent typ errors
      var newSum = parseFloat(array[processIndex].took) + tookXXms;

      //Add the amount to the current amount
      array[processIndex].took = newSum.toFixed(4);
    }

    // Calculate the sid value by addign an s
    let sid = "s" + buttonId;

    // Ensure a sids list element in the array
    if (!array[processIndex].sids) {
      array[processIndex].sids = [sid];
      continue;
    }

    // Add a sid value to the existing sids element
    array[processIndex].sids.push(sid);
  }

  return array;
}

function getTook(buttonId) {
  //Get the cell with the content "Took xx ms", after the finish row
  var tc =
    table.rows[document.getElementById("f" + buttonId).rowIndex + 1].cells[1];

  //Extract the TookXXms of the cell
  var tookXXms = tc.innerText.slice(tc.innerText.indexOf("T"));

  //Extract only the float value
  var float = parseFloat(
    tookXXms.slice(5, tookXXms.indexOf("ms")).replace(",", ".").replace(" ", "")
  );

  return float;
}

//Jump to the first occurence of "Success = false" in the trace
function jumpToError(evt) {
  var el = evt.target;
  el.disabled = true;
  addSpinner(el);
  setTimeout(() => {
    //Select the first element in the DOM with an error class
    var e = document.querySelector(".error");

    if (e == null) {
      alert(
        "The string 'Success = false' could not be found in this trace for any of the identified proceses. However, please use CTRL + F just to double check :)"
      );
    } else {
      collapseExpandAll("expand");
      //Navigate to the element
      e.id = "firstError";
      e.scrollIntoView({
        block: "center",
      });
    }

    el.disabled = false;
    removeSpinner(el);
  }, 20); // <-- arbitrary number greater than the screen refresh rate
}

//Check if there are tables that need to be hidden
function hasTablesTooHide() {
  //Do nothing if less then 2 tables have been found
  if (tables.length <= 2) {
    //Return false so now button will be added to the DOM
    return false;
  }
  return true;
}

//Hide the tables at the end of a trace that are barely used for analysis
function hideTables() {
  //Hide/Show all tables except the first two
  for (i = 2; i < tables.length; i++) {
    tables[i].classList.toggle("hidden");
  }
}

//Add HTML to the DOM to trigger hideTables()
function addHideTableButton() {
  var node2 = document.createElement("div");
  var button = "<button id='hideTables'>More info</button>";
  node2.innerHTML = button;
  table.parentNode.insertBefore(node2, table.nextSibling);
}

//Add spinner to specified element
function addSpinner(e) {
  var spinner = document.createElement("span");
  spinner.classList.add("spinner");
  e.appendChild(spinner);
}

//Remove spinner from a specified element
function removeSpinner(e) {
  e.querySelector(".spinner").remove();
}

//Separate whitespaces from text by splitting them into 2 span elements
function splitContent(td, string) {
  var inner = td.innerHTML;
  var split = inner.indexOf(string);
  var part1 = inner.slice(0, split);
  var part2 = inner.slice(split);

  var node1 = document.createElement("span");
  var node2 = document.createElement("span");

  node1.innerHTML = part1;
  node2.innerHTML = part2;

  td.innerHTML = "";

  td.appendChild(node1);
  td.appendChild(node2);
}

// Function to update the progress bar
function updateProgressBar() {
  // Calculate the percentage of steps finished
  const percentComplete = (numStepsFinished / totalNumSteps) * 100;
  // Update the width of the progress bar element
  progressBar.style.width = `${percentComplete}%`;
  // Force an update of the UI
  //progressBar.offsetHeight;
}

// Call the updateProgressBar function whenever a step is finished
function finishStep() {
  /* ---For debugging---  
   if (numStepsFinished > 0) {
    //Stop the timer of the previous step
    console.timeEnd("Step " + numStepsFinished);
  }
  */

  //Increae step counter
  numStepsFinished++;

  //Show HTML element in first iteration
  if (numStepsFinished == 1) {
    progressBar.classList.remove("hidden");
  }

  //Update the progressbar
  updateProgressBar();

  //Start the timer for the next step
  //console.time("Step " + numStepsFinished);

  //Not the last step?
  if (numStepsFinished < totalNumSteps && numStepsFinished > 0) {
    return;
  }

  //Re-hide the HTML after last step and reset for next usage
  setTimeout(() => {
    //If a reset has already occured by some other process, do nothing
    if (numStepsFinished == 0) {
      return;
    }
    //Stop the timer of the last step
    //console.timeEnd("Step " + numStepsFinished);
    progressBar.classList.add("hidden");
    //reset to initial state
    progressBar.style.width = 0;
    numStepsFinished = 0;
  }, 500); //Progress bar stays visible for a short time after finishing
}

function addLineNumbers() {
  table.rows[1].cells[0].innerText = "#";
  for (i = 2; i < tl; i++) {
    table.rows[i].cells[0].innerText = i - 1 + ".";
  }
}

function applyDefaultColumnWidth() {
  //Set the colspan of the first th cell from 10 to 4
  table.rows[0].cells[0].colSpan = 4;
  var colgroup = document.createElement("colgroup");
  var col1 = document.createElement("col");
  col1.style.width = "5%";
  var col2 = document.createElement("col");
  col2.style.width = "85%";
  var col3 = document.createElement("col");
  col3.style.width = "5%";
  var col4 = document.createElement("col");
  col4.style.width = "5%";

  colgroup.appendChild(col1);
  colgroup.appendChild(col2);
  colgroup.appendChild(col3);
  colgroup.appendChild(col4);

  table.appendChild(colgroup);

  table.style.tableLayout = "fixed";
}

