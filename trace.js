formatTrace();

//SETUP FOR TRACE FORMATTING
function formatTrace() {

  //Find the table that contains the trace
  window.table = findTable();

  if (table == null) {
    noTraceFoundStop();
    return;
  }

  //Measure how long it took to render the DOM and log it to the console
  measureDOMLoadingDuration();

  //Hide the trace table in case a table was found and show a lightweight skeleton instead to improve the performance
  showTraceTableSkeleton();

  //Show the hidden trace content. It was hidden with a CSS rule to prevent layout reflowing. This reveals the skeleton
  revealHiddenTraceContent();

  //Global const for the table length of the table that contains the trace information
  window.tl = table.rows.length;

  //const MAX_ROWS_FOR_PROCESSING = 30000; //Was needed when formatting was really slow. To be phased out

  //Declare a variable to store all buttonids for the collapse/uncollapse all actions
  window.buttonids = [];

  window.buttonIdToIndexMap = {};

  //Array to store all pairs of starting elements (green rows) and finishing elements (red rows)
  window.processActionStartElements = []; // [RowIndex, ProcessId, RowIndexFinishElement]

  //Array to store all finishing elements (red rows) to match them later
  window.processActionfinishElements = []; // [RowIndex, ProcessID]

  //Array to store all pairs of forEachElements (orange rows)
  window.forEachActionStartElements = []; // [RowIndex, ForEachActionID, ForEachActionPos, RowIndexNextForEachAction]

  //The first table row that contains the string "Success = False" after a finished process action
  window.firstErrorRow = null;

  //Ranking of all rows sorted from slowest to fastest
  window.performanceranking = [];

  //Ranking of all rows sorted from most frequent to least popular
  window.popularranking = [];

  //When this code has already been executed a lot of it does not have to be executed again. 
  window.lazymode = false;

  //If the traceformatter has already run then there is an array with button IDs that is stored as an HTML element in the DOM. Set lazymode = true if any IDs can be extracted
  lazymode = extractButtonIdsFromDOM();

  //Ensure basic UI elements and their eventlisteners
  initializeUIandEventListeners(lazymode);

  //Progess bar setup --

  //Define the progress bar element in the global scope so it can be referred to by the functions updateProgressBar() and finishStep()
  window.progressBar = document.querySelector(".progress-bar");

  //Set the initial number of finished steps in the global scope
  window.numStepsFinished = 0;

  //Global variable for the number of steps that will be displayed by the progress bar while formatting
  window.totalNumSteps = 3;

  //Step 1: Change UI
  //Step 2: Scanning and matching
  //Step 3: Add all buttons

  //If the trace has been formatted already do nothing since it would lead to undesirably long loading times
  if (!lazymode) {
    //Scan the table with the trace information, find pairs of starting and finishing elements and add "buttons" to make them collapseable/expandable.
    scanTableFindMatchesAddButtons();
  }
}

//FUNCTIONS ----

//Ensure and show a skeleton view of the actual table until loading has finished
function showTraceTableSkeleton() {

  //console.log("Hiding the table, show a skeleton view for performance");
  table.classList.add("hidden");

  let e = document.getElementById("skeleton-wrapper");

  if (e != undefined) {
    e.classList.remove("hidden");
    return;
  }

  //Add a new skeleton node to DOM

  const skeletonWrapper = document.createElement('div');
  skeletonWrapper.id = "skeleton-wrapper";
  skeletonWrapper.classList.add("shimmer");

  // Create the new skeleton table element
  const skeleton = document.createElement('table');
  skeleton.style.width = '100%';
  skeleton.style.borderCollapse = 'collapse';
  skeleton.style.tableLayout = 'fixed';
  skeleton.cellSpacing = '0';
  skeleton.cellPadding = '0';
  skeleton.border = '0';
  skeleton.id = "skeleton";

  // Create the tbody element
  const tbody = document.createElement('tbody');

  // Create the first row (header row)
  const headerRow = document.createElement('tr');

  // Create the header cell for the first row
  const headerCell = document.createElement('th');
  headerCell.classList.add('alt');
  headerCell.colSpan = '4';
  headerCell.align = 'left';

  // Create the h3 element for the header cell
  const h3 = document.createElement('h3');
  const b = document.createElement('b');
  b.textContent = 'Trace Information';

  // Append the b element to the h3 element
  h3.appendChild(b);

  // Append the h3 element to the header cell
  headerCell.appendChild(h3);

  // Append the header cell to the header row
  headerRow.appendChild(headerCell);

  // Append the header row to the tbody
  tbody.appendChild(headerRow);

  // Create the second row (subheader row)
  const subHeaderRow = document.createElement('tr');
  subHeaderRow.classList.add('subhead');
  subHeaderRow.align = 'left';

  // Define the subheader cell contents
  const subHeaderCellsContent = ['#', 'Message', 'From First(s)', 'From Last(s)'];

  // Create and append the subheader cells to the subheader row
  subHeaderCellsContent.forEach(content => {
    const th = document.createElement('th');
    th.textContent = content;
    subHeaderRow.appendChild(th);
  });

  // Append the subheader row to the tbody
  tbody.appendChild(subHeaderRow);

  // Create rows
  addFakeRows(50);

  // Append the tbody to the table
  skeleton.appendChild(tbody);

  // Create the colgroup element
  const colgroup = document.createElement('colgroup');

  // Define the styles for each col element
  const colStyles = ['5%', '85%', '5%', '5%'];

  // Create and append the col elements to the colgroup
  colStyles.forEach(style => {
    const col = document.createElement('col');
    col.style.width = style;
    colgroup.appendChild(col);
  });

  // Append the colgroup to the table
  skeleton.appendChild(colgroup);

  //Append the table to the wrapper
  skeletonWrapper.appendChild(skeleton);

  // Append the table to the tracecontent
  let tracecontent = document.querySelector(".tracecontent");
  tracecontent.insertBefore(skeletonWrapper, tracecontent.children[3]);

  function addFakeRows(n) {

    for (i = 1; i <= n; i++) {

      const newRow = document.createElement('tr');
      newRow.classList.add("skeleton-row");

      if (i % 2 === 0) { //add the alternating row color to even rows
        newRow.classList.add('alt');
      }

      var tr = table.rows[i + 1];

      // Define the cell contents
      const cellContents = [i + '.', tr.cells[1].textContent, tr.cells[2].textContent, tr.cells[3].textContent];

      // Create and append the cells to the new row
      cellContents.forEach(content => {
        const td = document.createElement('td');
        td.textContent = content;
        newRow.appendChild(td);
      });

      // Append the new row to the tbody (assuming tbody is already defined or you can select it)
      tbody.appendChild(newRow);
    }
  }
}

//Hide the skeleton and reveal the actual trace data
function hideTraceTableSkeleton() {

  //console.log("Showing the table, hide the skeleton view");

  table.classList.remove("hidden");

  let skeleton = document.getElementById("skeleton-wrapper");

  if (skeleton == undefined) {
    return;
  }

  skeleton.classList.add("hidden");
}

//By design style.css hides all content to speed up loading. This code reveals all content
function revealHiddenTraceContent() {

  var id = "revealTraceContent";

  if (document.getElementById("id") != undefined) {
    return;
  }

  // Create a new style element
  let style = document.createElement('style');
  style.id = id;
  style.innerHTML = '.tracecontent { display: block !important; }';
  // Append the new style element to the head
  document.head.appendChild(style);
}

//Remove the injected CSS that ensures that the trace is visible
function hideTraceContent() {
  var style = document.getElementById("revealTraceContent");

  if (style == undefined) {
    return;
  }

  style.remove();
}

//Does the current website require formatting?
function isNovuloTrace() {
  // Get the current URL
  const currentURL = window.location.href;

  // Check if the URL contains "race.axd" so it can be Trace.axd or trace.axd
  return currentURL.includes('race.axd');
}

//Measure how long it takes to render the DOM and log it to the console
function measureDOMLoadingDuration() {
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
}

//Find the table the contains the actual trace data
function findTable() {
  var tableID = "trace-table";
  var bodyClass = "traceformatter-was-here";

  //Try to find the actual trace content. The id only exists if it has been set by an earlier formatting so in most case it will be undefined
  var t = document.getElementById(tableID);

  //Table found with an id that has been set by a previous formatter
  if (!(t == undefined)) {
    setBodyClass(bodyClass);
    return t;
  }

  //continue searching...

  //The second table of an unformatted trace contains the actual trace info.
  t = document.getElementsByTagName("table")[1];

  //If no second table is found, the DOM does not contain a trace
  if (t == undefined) {
    return null;
  }

  //Ensure that the first row of the found table contains the string "Trace"
  if (!t.rows[0].textContent.includes("Trace")) {
    return null;
  }

  //Set the id so the the next traceformatter can find the table immediatly
  t.id = tableID;

  setBodyClass(bodyClass);
  return t;

  //Set the unique body class to prevent undesirable CSS styling
  function setBodyClass(bodyClass) {
    document.body.classList.add(bodyClass);
  }

}

//If no table exists that potentially contains trace info, throw an error
function noTraceFoundStop() {

  if (isNovuloTrace()) { //Maybe we are on the trace overview page as no table with trace content has been found

    //If we are on the trace overview page, replace the "Clear trace" link with a button
    replaceClearButton();

    //Also show the hidden body
    revealHiddenTraceContent();
  }

  console.warn(
    "NovuloTraceformatter has been stopped because no table was found that could be formatted"
  );
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
  );

  if (!existingLink) {
    return;
  }

  existingLink = existingLink.parentElement;

  if (!existingLink) {
    return;
  }

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

//If the traceformatter has already run then there is an array with button IDs that is stored as an HTML element in the DOM
function extractButtonIdsFromDOM() {

  var arrayEl = document.getElementById("buttonIdsElement");

  //Do nothing if the element does not exist
  if (arrayEl == null) {
    return false;
  }

  //Get the JSON string from the DOM
  let butttonIDsString = arrayEl.getAttribute("data-array");

  //Fill the global buttonids variable with the ids.
  buttonids = JSON.parse(butttonIDsString);

  // Process the buttonids array into a dictionary for getFinishIndex()
  for (var i = 0; i < buttonids.length; i++) {
    buttonIdToIndexMap[buttonids[i][0]] = buttonids[i][1];
  }

  //Turn on lazymode when more than 0 button ids where found
  return buttonids.length > 0 ? true : false;

}

//Ensure basic UI elements and their eventlisteners
function initializeUIandEventListeners() {

  //lazy mode = true when another traceformatter has already formatted the trace in the past
  if (lazymode) {

    //Re-apply all eventlisteners to all starting elements (green rows for collapsing/expanding)
    reApplyEventListenersToStartingElements();

  } else { //Only skip adding relevant UI elements when the trace has been formatted earlier
    // Add buttons to the DOM
    addAllUIButtons();

    //Add the progress bar to the DOM
    addProgressBarUI();

    //Add line numbers to the rows of the trace content table
    addLineNumbers();

    //Prevent extreme horizontal widths when cells have a lot of content like long SQL queries
    applyDefaultColumnWidth();

  }

  //Add eventlisteners as functions cannot be called from the buttons themselves. The buttons are on the DOM and cannot access the scope of this .js file
  addEventListenersToUIButtons();

  //Hide tables below the trace that are not required for most trace analysis
  hideUnnecessaryTables();
}

//Re-apply all eventlisteners to all starting elements (green rows for collapsing/expanding)
function reApplyEventListenersToStartingElements() {

  if (buttonids == null) {
    return;
  }

  for (i = 0; i < buttonids.length; i++) {
    var row = document.getElementById("s" + buttonids[i][0]);
    row.addEventListener("click", toggleCollapseWrapper2);
  }
  console.log(
    "Finished re-applying eventlisteners to all buttons for collapsing/expanding"
  );
}

//Add all buttons to the top of the screen
function addAllUIButtons() {
  var node = document.createElement("div");
  node.id = "buttonwrapper";

  //Create all button elements
  var button1 = createButton("buttontrigger", "Enable Collapsing", "inline-block");
  var button2 = createButton("collapseAll", "▼ Collapse All", "none", "collapse");
  var button3 = createButton("JumptoError", "Jump to error 🚨");
  var button4 = createButton("JumpToSlowest", "Jump to slowest 🐌");
  var button5 = createButton("topten", "Top twenty slowest 🥇", "inline-block");
  var button6 = createButton("mostpopular", "Most popular 📸", "none");
  var button7 = createButton("feedback", "Feedback 💌", "inline-block");

  //Append all buttons to the wrapper element
  node.appendChild(button1);
  node.appendChild(button2);
  node.appendChild(button3);
  node.appendChild(button4);
  node.appendChild(button5);
  node.appendChild(button6);
  node.appendChild(button7);

  //Create an element to store the IDs of the buttons later, when the formatting is done
  var buttonIdsElement = document.createElement("div");
  buttonIdsElement.id = "buttonIdsElement";
  node.appendChild(buttonIdsElement);

  document.body.insertBefore(node, document.body.firstChild);
}

//Create a button element for an id string, a label text, a default display 
function createButton(id, text, display = "none", className = "") {
  var button = document.createElement("button");
  button.id = id;
  button.style.display = display;
  button.className = className;
  button.textContent = text;
  return button;
}

//Add eventlisteners as functions cannot be called from the buttons themselves. The buttons are on the DOM and cannot access the scope of this .js file
function addEventListenersToUIButtons() {
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
}

//Initialize the UI elements for the progress bar in the DOM
function addProgressBarUI() {
  //Create the container element
  const container = document.createElement("div");
  container.classList.add("progress-bar-container");

  //Create the progress bar element
  const progressBar = document.createElement("div");
  progressBar.classList.add("progress-bar");
  progressBar.style.width = 0;

  //Append the progress bar to the container
  container.appendChild(progressBar);

  //Insert the container into the document body
  document.body.appendChild(container);
}

//Open a mailto url to open a mail program for writing a feedback email
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

//Scan the whole table, find matches between process start and finish elements, then add buttons so they can be collapsed/expanded
function scanTableFindMatchesAddButtons(evt) {

  //Hide the trace content to prevent reflows that cause performance issues
  showTraceTableSkeleton()

  // ----------- Step 1 ------------//

  console.time("Total formatting");

  disableButtonTrigger();

  if (evt != undefined) {
    var e = evt.target;
    e.disabled = true;
    addSpinner(e);
  }

  finishStep(); //Step 1

  // Nested in a timeout to ensure that the spinner and the loading bar are displayed correctly
  setTimeout(() => {
    // ----------- Step 2 ------------//

    console.time("Scan " + tl + " rows");

    //Scan the whole table and fill the Starting and Finish element
    scanTable(table, 2, tl); //start scanning from row 2 since the data starts there

    console.timeEnd("Scan " + tl + " rows");

    console.time("Match " + processActionStartElements.length + " start and finish rows");

    //find matches between all starting and finishing elements
    findMatches();

    console.timeEnd("Match " + processActionStartElements.length + " start and finish rows");

    finishStep(); //Step 2

    //Nested in a timeout to ensure that the spinner and the loading bar are displayed correctly
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

//This is legacy. It can be removed if the decision to drop the threshold for not execution the formatting for large tables was fine.
function disableButtonTrigger() {
  var buttontrigger = document.getElementById("buttontrigger");

  buttontrigger.disabled = true;
  buttontrigger.textContent = "Enabling collapsing";
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

//Store the button ids (start and end pairs) in the DOM. This way the ids can be extracted and reused when the trace html file is reopend again 
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

  //Scan each cell for a potential pattern match
  for (let rowIndex = from; rowIndex < until; rowIndex++) {

    //Current table row element
    var tr = t.rows[rowIndex];
    //Second cell in the row
    var t1 = tr.cells[1];
    //String in second cell
    var t1textContent = t1.textContent.replace(/\n/g, ''); //Remove any \n from the original string

    //Search for either start/finishing elements of process actions and continue the loop when a match was found
    if (findProcessActions(tr, t1textContent, rowIndex)) {
      continue;
    }

    //Search for the rows of forEachActions
    if (findForEachActions(t, tr, t1textContent, rowIndex)) {
      continue;
    }

    //More pattern matching

  }
}

//Find the starting and finishing elements of process actions
function findProcessActions(tr, t1textContent, rowIndex) {

  var isStartingCell = t1textContent.indexOf("Starting process") > -1;

  if (!isStartingCell) {

    var isFinishCell = t1textContent.indexOf("Finished process") > -1;

    if (!isFinishCell) {
      return false;
    }
  }

  //Extract and save process id as element id
  var id = getProcessActionID(t1textContent);

  //if the id is not valid, then continue
  if (!(id > 0)) {

    return false;
  }

  if (isStartingCell) {

    //merge row id and process id to unique string
    var sid = "s" + rowIndex + "_" + id;
    //set as element id
    tr.id = sid;
    tr.classList.add("process_action");
    //create a new StartingElement for the row and the process id. The rowindex of the matching "finish" element is left empty
    var StartingElement = [rowIndex, id, 0];
    //add it to the list of StartingElements
    processActionStartElements.push(StartingElement);
    return true;
  }

  if (isFinishCell) {
    var FinishElement = [rowIndex, id];
    processActionfinishElements.push(FinishElement);
    return true;
  }
}

//Get the process ID at the end of a string
function getProcessActionID(string) {

  if (string.length < 5) {
    return "";
  }

  var array = string.slice(-10).split("_");
  var last = array.length - 1;
  var id = parseInt(array[last]);

  return id;
}

//Find the starting elements that should become collapsible
function findForEachActions(t, tr, t1textContent, rowIndex) {

  //Check for the relevant pattern. The row should contain 'Running action ' and '(ForEachAction)' at the end
  var isForEachCell = t1textContent.indexOf("Running") > -1 && t1textContent.indexOf("(ForEachAction)") > -1;

  if (!isForEachCell) {
    return false;
  }

  //Create a unique identifier for the action to facilitate collapsing later
  var id = getForEachActionID(t, tr, t1textContent, rowIndex);

  //Merge row id and ForEachAction ID into a unique string
  var sid = "s" + rowIndex + "_" + id;
  //Set it as the element id so that it can be found later
  tr.id = sid;
  tr.classList.add("foreach_action");

  var pos = getForEachActionPos(t, rowIndex);

  //Create a new forEachElement for the row and the forEachAction id. The rowindex of the next foreach element is left empty
  var forEachElement = [rowIndex, id, pos, 0]; // [RowIndex, ForEachActionID, ForEachActionPos, RowIndexNextForEachAction]
  //add it to the list of StartingElements
  forEachActionStartElements.push(forEachElement);

  return true;
}

//Get the unique ID of a forEachAction table row
function getForEachActionID(t, tr, t1textContent, rowIndex) {

  //Only the next or the second next row can contain the unique list data
  for (i = 1; i <= 2; i++) {

    //Jump to the next row that is a potential "list row" and might contain the string '- list ='
    var listRow = t.rows[rowIndex + i];
    //Second cell in the list row
    var listRow = tr.cells[1];
    //String in  cell
    var listCellString = listRow.textContent;

    if (!listCellString.indexOf("- list =")) {
      continue;
    }

    //Create a (hopefully) unique hash for the name of the action and the content of the loop.
    //This also takes into account nesting as the spaces wihtin t1textContent also count as characters
    //If a developers choses to loop through the same list twice without changing the name of the forEachaction, unintentional duplicates can occur
    return simpleHash(t1textContent + listCellString);

  }

  return null;

}

//Get the position of the for each action
function getForEachActionPos(t, rowIndex) {

  i = 3;  //Only the third next or the fourth next row can contain the position data

  var isDone = 0;

  while (i <= 4) {

    //Jump to the third row that is a potential "position row" and might contain the string '- pos ='
    var RowCellString = getNextCellString(t, i);

    //Match the pattern 'pos = '
    const matchPos = RowCellString.match(/pos\s*=\s*(\d+)/);
    //Is the cell a position cell?
    if (matchPos != null) {

      if (i == 4) {
        //Match the pattern 'done = ' in the 5th row. When the for each is done the matchPos value has to be increased by 1     
        isDone = getNextCellString(t, 5).indexOf("done = True=boolean") > -1 ? 1 : 0;
      }

      //Return the number using capturing paranthesis and convert it into an INT
      return matchPos ? parseInt(matchPos[1], 10) + isDone : null;
    }
    i++;
  }

  return null; //If the while does not result in finding a match, no possition data is available 

  function getNextCellString(t, n) {
    var Row = t.rows[rowIndex + n];
    //Second cell in the list row
    var RowCell = Row.cells[1];
    //String in  cell
    var RowCellString = RowCell.textContent;
    return RowCellString;
  }
}

//Create a simple hash for any given string
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash;
}

//Find a matching finishing element for all starting elements
function findMatches() {

  findProcessActionMatches();

  findForEachActionMatches();
}

//For each StartingElement in the array
function findProcessActionMatches() {
  //find an unmatched start element by searching backwards in the array
  for (i = processActionStartElements.length - 1; i >= 0; i--) {
    findProcessActionMatch(processActionStartElements[i]);
  }
}

//Find a matching finishing element for a single starting element
function findProcessActionMatch(processActionStartElement) {

  var processIdStart = processActionStartElement[1]

  /*  Can be deleted since we are not double checkign starting elements any more
    //Has a finish element already been found?
    if (processActionStartElement[2] != 0) {
      return; //Nothing to do here...
    }
  */

  //this is the last occurence of the process ID in the StartingElements array. We need to find a matching finish element for it now.
  var startingElementrowIndex = processActionStartElement[0];

  var pafeL = processActionfinishElements.length;

  for (j = 0; j < pafeL; j++) {

    //Match based on ID found?
    if (processIdStart != processActionfinishElements[j][1]) {
      continue;
    }

    var rowIndexFinishElement = processActionfinishElements[j][0];

    //is the row index of the starting element lower than the one of the finishing element? Or in other words: Does the potential match appear lower in the list?
    if (startingElementrowIndex >= rowIndexFinishElement) {
      continue;
    }

    //create the unique id
    var id = getButtonID(startingElementrowIndex, processIdStart, rowIndexFinishElement);

    var finishElement = table.rows[rowIndexFinishElement];

    setFinishRowID(id, finishElement, "process_action")

    /* Can be deleted since we are not double checkign starting elements any more
        //store the row index of the found finished-element in the pair[]
        processActionStartElement[2] = rowIndexFinishElement;
    */
    /*
          console.log(
            "Match found for process ID '" +
            processActionStartElements[i][1] +
            "' It will collapse from row '" +
            processActionStartElements[i][0] +
            "' until row' " +
            processActionStartElements[i][2] +
            "'"
          );
    */

    //A match has been found an correctly processed for FinishElements[j]. Therefore it can be removed from the arrray
    processActionfinishElements.splice(j, 1);

    return; //Exit the for-loop and the funnction to continue searching for the next StartingElement

    //when no match was found continue searching until the last item in FinishElements
  }

  // Can be deleted since we are not double checkign starting elements any more
  //if the row index of the finish element could not be set after looking at all of the relevant FinishElements or
  /*if (
    processActionStartElement[2] == 0 ||
    processActionStartElement[2] == undefined ||
    processActionStartElement[2] == null
  ) {
  */
  
  //If the for loop has not been exited earlier then no match could be found
  var sid = "s" + startingElementrowIndex + "_" + processIdStart;
  noFinishElementFoundForStartingElement(sid);

  /*  Can be deleted since we are not double checkign starting elements any more
  //set it to -1 to indicate that nothing was found
  processActionStartElements[i][2] = -1;
  */
}

//Style starting cells with a plugin error that do not have a finish cell
function noFinishElementFoundForStartingElement(sid) {
  console.log("Could not find the finish element for starting element with id" + sid);
  //Get the cell of the failed process and highlight it red
  var unfinishedProcess = document.getElementById(sid);
  //Apply CSS class
  unfinishedProcess.cells[1].classList.add("error");
}

//Create the string for a button id based on the parameters
function getButtonID(startingElementrowIndex, actionID, rowIndexFinishElement) {

  var id = startingElementrowIndex + "_" + actionID;
  //Store it in an array
  var buttonid = [id, rowIndexFinishElement];
  //Add an extra element to map that is used in the getfinishindex() function
  buttonIdToIndexMap[id] = rowIndexFinishElement;
  //Add the button id to an array that can be used for the AddButtons() function and the "Collapse/Expand all" actions
  buttonids.push(buttonid);

  return id;
}

//For each forEachActionStartElement find the finish row for collapsing
function findForEachActionMatches() {

  const l = forEachActionStartElements.length;

  for (h = 0; h < l; h++) {

    var currentElement = forEachActionStartElements[h];

    var rowIndexFinishElement = currentElement[3];

    //Only if the pair does not have a rowindex for the next for each element set
    if (rowIndexFinishElement != 0) {
      continue;
    }

    var pos = currentElement[2];

    matchFinishElementForEachAction();

    //Only if a row index was found after the first try
    if (rowIndexFinishElement != 0) {
      setForEachFinishElementId(currentElement);
      continue;
    }

    //When the action is the last one and therefore has no next element, set the rowindex of the 8th next row
    if (pos != 0) { //position should not be 0, otherwise it would not be the last, but also the first action
      currentElement[3] = currentElement[0] + 8;
      setForEachFinishElementId(currentElement)
      continue;
    }

    //When the action is the first and last one and therefore has no next element, set the rowindex of the 8th next row
    if (pos == 0) {
      currentElement[3] = currentElement[0] + 8;
      setForEachFinishElementId(currentElement)
      continue;
    }

    var sid = "s" + currentElement[0] + "_" + currentElement[1];

    noFinishElementFoundForStartingElement(sid);

    //No match was found for whatever reason
    delete forEachActionStartElements[h]; // currentElement

  }

  function matchFinishElementForEachAction() {

    const id = forEachActionStartElements[h][1];

    //Scan trough the list to find the first element with the same id
    var g = h; //Start scanning from the position after the current element

    var found = false;

    while (g < l - 1 && !found) {

      g++; //increase the counter by 1

      if (forEachActionStartElements[g][1] != id) {
        continue;
      }

      if (forEachActionStartElements[g][2] <= pos) {
        continue;
      }

      found = true; //Exit the while

      //A match was found. The row id of the previous row is stored at the element as the next for each element
      rowIndexFinishElement = forEachActionStartElements[g][0] - 1; //update var for parent process

      //Update the array
      forEachActionStartElements[h][3] = rowIndexFinishElement;
    }
  }


  function setForEachFinishElementId(forEachElement) {

    var rowIndexFinishElement = forEachElement[3];

    var tr = table.rows[rowIndexFinishElement];

    //Do not overwrite existing ids
    if (tr.id != "") {
      return;
    }

    //Create a unique string for the finish element so that the collapse function can find it
    var id = getButtonID(forEachElement[0], forEachElement[1], rowIndexFinishElement)

    setFinishRowID(id, tr, "foreach_action");

  }
}

//Set the ID for a finish row based on the situation and the startelement
function setFinishRowID(id, tr, className) {
  //Concat an f for the finish element
  var fid = "f" + id;
  //set it as the id of the html element
  tr.id = fid;
  tr.classList.add(className);
}

//Add all buttons based on the global buttonids variable and split the task in multiple threads
function addAllButtonsPromise() {

  console.time("Add " + buttonids.length + " buttons");

  // Split the array into multiple arrays, each with a maximum of 100 items
  const splitArrays = buttonids.reduce(
    (acc, item) => {
      // If the current array in the accumulator is full, create a new array
      if (acc[acc.length - 1].length === 10) {
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

//Execute the actions after a succesfully adding collapsable buttons to all required rows
function allButtonPromisesResolved() {
  hideTriggerUIShowAllbuttons();
  storeButtonIds();
  hideTraceTableSkeleton(); //Shows the main table with the trace info
  revealHiddenTraceContent(); //Only required 
  finishStep(); //Step 3
  console.timeEnd("Total formatting");
}

//Add multiple buttons based on
function addButtons(array) {
  //Add a button for each button id in the array
  for (let j = 0; j < array.length; j++) {
    ensureToggleButton(array[j][0], array[j][1]);
  }
}

//Add a single button to a specific collapsable cell
function ensureToggleButton(buttonid, rowIndexFinishElement) {

  //Determine the no of rows to be collapsed
  var rowcount = noOfRows(buttonid);

  //Add an eventlistener and styling to the start cell
  formatStartCell(buttonid, rowIndexFinishElement, rowcount);

  //Add anchor at finish elemement to jump to the start at TabelRowFinishCell (trfc)
  formatFinishCell(buttonid, rowcount);

}

//Add an eventlistener and styling to the start cell
function formatStartCell(buttonid, rowIndexFinishElement, rowcount) {

  //trs = TableRowStartElement
  var trs = document.getElementById("s" + buttonid);
  // Get second cell in the row
  var t1 = trs.cells[1];

  var isForProcessAction = trs.classList.contains("process_action");

  if (isForProcessAction) {
    //Separate whitespaces from text by splitting them into 2 span elements
    splitContent(t1, "S");
  } else if (trs.classList.contains("foreach_action")) {
    isForForEachAction = true;
    //Separate whitespaces from text by splitting them into 2 span elements
    splitContent(t1, "R");
  } else {
    console.log("Something strange happens at button id " + buttonid);
    return;
  }

  var span2 = t1.getElementsByTagName("span")[1];
  span2.classList.add("start");

  //Add an utf8-triangle and the row count to the span element
  span2.textContent = `▼ ${span2.textContent} (${rowcount} rows)`;

  trs.addEventListener("click", toggleCollapseWrapper2);

  if (!isForProcessAction) { // Do not search for a "Success = False" cell for any other rows than process action  
    return;
  }

  //if (firstErrorRow == null) {
  formatSuccessFalseCell(rowIndexFinishElement);
  //}

}

//Add styling to the "Success=False" cell
function formatSuccessFalseCell(rowIndexFinishElement) {

  var successRowIndex = rowIndexFinishElement + 3;

  if (successRowIndex >= tl) {
    return;
  }

  var successCell = table.rows[successRowIndex].cells[1];

  if (!(successCell.textContent.indexOf("alse") > -1)) { // The string false/ False it
    return;
  }

  firstErrorRow = successCell;

  successCell.classList.add("error");   //Highlight Success = False
}

//Add anchor at finish elemement to jump to the start at TabelRowFinishCell (trfc)
function formatFinishCell(buttonid, rowcount) {

  var trf = document.getElementById("f" + buttonid);

  if (trf == null) {
    console.log('Cannot find the finish cell for button id ' + buttonid);
    return;
  }

  var trfc = trf.cells[1];
  var trfci = trfc.innerText;

  //Split the cell according to the situation
  if (trfci.indexOf("Took:") > -1) {  //Took: ...
    splitContent(trfc, "T");
  } else if (trfci.indexOf("Only one") > -1) { //Only one ...
    splitContent(trfc, "O");
  } else { //Finished ...
    splitContent(trfc, "F");
  }

  var fspan2 = trfc.getElementsByTagName("span")[1]; // Get the span with the text. [0] contains only spaces

  fspan2.classList.add("finish");

  var anchor = document.createElement("a");
  anchor.textContent = ` Jump ${rowcount} rows up`;
  anchor.addEventListener("click", jumpToStartRow);
  fspan2.appendChild(anchor);
}

//Jump to the start row of a finish element
function jumpToStartRow(evt) {
  var anchorTag = evt.target;
  if (anchorTag == undefined) {
    return;
  }
  var fid = anchorTag.parentElement.parentElement.parentElement.id;
  var id = fid.replace("f", "s");
  if (id == null) {
    return;
  }
  jumpToId(id);
}

//Triggers collapseExpandAll() but requires a button event as an input
function toggleCollapseExpandAll(evt) {

  //The button
  var e = evt.target;

  //set the variable that will be passed to toggleCollapse()
  var collapseExpand = "";

  //If the button is set to collapse all
  if (e.classList.contains("collapse")) {
    collapseExpand = "collapse";
  } else {
    //If the button is set to expand all
    collapseExpand = "expand";
  }

  disableCollapseAllButton(collapseExpand);

  collapseExpandAll(collapseExpand);
}

//Disable the button, add a spinner and update the label
function disableCollapseAllButton(collapseExpand) {

  var e = document.getElementById("collapseAll")
  //disable the button to prevent double clicks
  e.disabled = true;
  addSpinner(e);

  if (collapseExpand == "collapse") {
    //Update the button label
    e.textContent = "► Expand all";
    //Set the next mode for a button click
    e.classList.remove("collapse");
  } else if (collapseExpand == "expand") {
    //Update the button label
    e.textContent = " ▼ Collapse all";
    //Set the next mode for a button click
    e.classList.add("collapse");
  }

}

//Collapse or expand all rows of the table. Input is either the string "collapse" or "expand".
function collapseExpandAll(collapseExpand) {
  //Log the total time of collapsing/expanding items
  const timerlabel = collapseExpand + " " + buttonids.length;
  +" items";
  console.time(timerlabel);

  showTraceTableSkeleton();

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
      toggleCollapse(buttonids[l][0], "collapse");
    }
    finishStep();
    batchIndex++;
    if (batchIndex < batchCount) {
      //Trigger next batch in 0 ms
      setTimeout(collapseBatchLoop, 0);
    } else {
      //All batches finished
      hideTraceTableSkeleton();
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
      hideTraceTableSkeleton();
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

  console.log("Process Actions: " + processActionStartElements.length);
  switchTrianglesForArray(processActionStartElements);

  console.log("ForEach Actions: " + forEachActionStartElements.length);
  switchTrianglesForArray(forEachActionStartElements);

  function switchTrianglesForArray(a) {

    for (i = 0; i < a.length; i++) {
      var startcell = table.rows[a[i][0]].cells[1].querySelector("span.start");
      if (startcell == undefined) {
        console.log("Could not find start cell for table row index " + a[i][0]);
        continue;
      }
      startcell.textContent = "▼" + startcell.textContent.slice(1);
      startcell.parentElement.parentElement.classList.remove("collapsed");

    }
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

  var collapsed = start.classList.contains("collapsed");

  //When the to be enforced option is already the status quo, nothing needs to happen.
  if (
    (collapseExpand == "collapse" && collapsed) ||
    (collapseExpand == "expand" && !collapsed)
  ) {
    //console.log("Collapsing/Expanding was skipped");
    return;
  }

  var rowcount = noOfRows(id);

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

//Expand cells for a single startcell
function expand(start, startcell, rowcount, startIndex) {

  //Show the start element again in case it was hidden
  start.classList.remove("hidden");

  //switch the triangle
  startcell.textContent = "▼" + startcell.textContent.slice(1);

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

//Collapse rows for a single startcell
function collapse(startcell, rowcount, startIndex, start) {
  //switch the triangle
  startcell.textContent = "►" + startcell.textContent.slice(1);

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

  if (id == null) {
    return undefined;
  }

  //get positions
  var startIndex = parseInt(id.split("_")[0]); //Split off the first part of the button id. "123_456789" becomes "123"

  var finishIndex = getFinishIndex(id);

  var noOfRows = finishIndex - startIndex ?? 0;

  if (noOfRows <= 0) {
    console.log("Something is messed up with sid " + sid + " and fid " + fid);
    return 0;
  }

  return noOfRows;

}

//Get the finish index for a given button id
function getFinishIndex(id) {

  index = buttonIdToIndexMap[id];
  if (index == null) {
    console.log("Index is null for " + id);
  }
  return index;
}

//Scroll to the position of the slowest row, triggered by the dedicated button
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

  var posid = performanceranking[pos][1];

  var parentRow = document.getElementById(posid).parentElement;

  jumpToId(posid, parentRow);
}

//Jump to a specific starting element based on the "data-sid" id that is linhked to the trigger element
function jumpToTriggerSid(evt) {

  var trigger = evt.target;
  var tr = trigger.parentElement.parentElement;
  var sid = tr.getAttribute("data-sid");
  var pos = parseInt(trigger.parentElement.parentElement.cells[0].innerText);

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

  var e = document.getElementById(id);

  //if a pos-id has been passed, jump to the parent tr instead of the td
  if (id.indexOf("pos") > -1) {
    e = e.parentElement;
  }

  //Overwrite if empty
  var flashElement = flashElement || e;

  //Expand everything only if the table row is not visible
  if (e.classList.contains("hidden") || e.classList.contains("hidden")) {
    disableCollapseAllButton("expand");
    collapseExpandAll("expand");

    scrollAfterWaiting(e, flashElement);
    return;
  }

  jumpToElement(e);

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
    float = parseFloat(td.textContent.replace(",", ".").replace(" ", ""));

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

//Let the background color of any element flash
function addFlash(el) {

  if (el == undefined) {
    return;
  }

  //Add flash class
  el.classList.add("flash");

  //Reset the animation in case it has already been added earlier
  el.style.animation = "none";
  el.offsetHeight; /* trigger a reflow */
  el.style.animation = null;

  //Remove the class after 1 second to prevent double flashes after expanding
  setTimeout(() => {
    //Add flash class
    el.classList.remove("flash");
  }, 1500);

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
function plotPerformanceTable(evt) {

  var id = "ranking";

  if (toggleTableVisibility(id, false)) {
    //exit if the table has already been plotted
    return;
  }

  //The button that triggered the function
  var e = evt.target;
  //disable the trigger element to prevent double clicks
  e.disabled = true;
  //Add a spinner to indicate loading
  addSpinner(e);

  setTimeout(() => { //Timeout because otherwise the UI wont update

    //If no max value has been identified yet and therefore getRanking() didn't run yet
    if (performanceranking.length <= 0) {
      performanceranking = getRanking();
    }

    //Declare a new table to display the data from ranking()
    var ptable = createPerformanceTable(id);
    document.body.insertBefore(ptable, document.body.firstChild);

    hideDifferentTable(id);

    e.disabled = false;
    removeSpinner(e);

  }, 20); // <-- arbitrary number greater than the screen refresh rate

}

//Add the slowest process actions to a table node
function createPerformanceTable(id) {
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

    h0.textContent = "Pos.";
    h1.textContent = "Seconds";
    h2.textContent = "Slow Processes";

    pcell0.textContent = i + 1 + ".";
    pcell1.textContent = performanceranking[i][0];

    var ael = document.createElement("a");
    ael.innerHTML = document
      .getElementById(performanceranking[i][1])
      .parentElement.cells[1].innerText.trim()
      .slice(0, 70);
    ael.addEventListener("click", jumpToSlowRow);
    pcell2.appendChild(ael);
  }
  return ptable;
}

//Plot the most frequent process actions
function plotPopularTable(evt) {

  var id = "popular";

  if (toggleTableVisibility(id, false)) {
    //exit if the table has already been plotted
    return;
  }

  //The button that triggered the function
  var e = evt.target;
  //disable the trigger element to prevent double clicks
  e.disabled = true;
  //Add a spinner to indicate loading
  addSpinner(e);

  setTimeout(() => { //Timeout because otherwise the UI wont update

    //Update the global variable of the popularity based on all starting elements
    popularranking = countAndSortIds(processActionStartElements);

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

    e.disabled = false;
    removeSpinner(e);

  }, 20); // <-- arbitrary number greater than the screen refresh rate
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
  for (let i = 0; i < processActionStartElements.length; i++) {
    let rowIndex = processActionStartElements[i][0];
    let processId = processActionStartElements[i][1];

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

//Get the cell with the content "Took xx ms", after the finish row
function getTook(buttonId) {

  //Get the table cell
  var tc = table.rows[document.getElementById("f" + buttonId).rowIndex + 1].cells[1];

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

  //Select the first element in the DOM with an error class
  var e = document.querySelector(".error");

  if (e == null) {
    alert(
      "The string 'Success = False' could not be found in this trace for any of the identified proceses. However, please use CTRL + F just to double check :)"
    );
    return;
  }

  var el = evt.target;
  el.disabled = true;
  addSpinner(el);

  setTimeout(() => {

    e.id = "firstError";

    //Expand everything if the error row is not visible
    if (e.parentElement.classList.contains("hidden")) {
      disableCollapseAllButton("expand");
      collapseExpandAll("expand");

      //console.log("Will scroll after waiting.");
      scrollAfterWaiting(e);

    } else {
      //Navigate to the element
      jumpToElement(e);
    }

    //console.log("Will remove spinner from error button.");
    el.disabled = false;
    removeSpinner(el);
  }, 20); // <-- arbitrary number greater than the screen refresh rate
}

//Scroll to any element
function jumpToElement(e) {
  e.scrollIntoView({
    block: "center",
  });
}

//Hide tables below the trace that are not required for most trace analysis
function hideUnnecessaryTables() {

  //Store all tables of the trace in an array
  let tables = document.querySelectorAll(".tracecontent>table");

  //Exit if no unnecessary tables exist
  if (tables.length <= 2) {
    return;
  }

  //Get the existing button for toggling the visibility
  var hideTablesBtn = document.getElementById("hideTables");

  //Ensure a new button if needed
  if (hideTablesBtn == null) {
    //Add a button to make them reappear if needed
    var node2 = document.createElement("div");
    var button = "<button id='hideTables'>More info</button>";
    node2.innerHTML = button;
    table.parentNode.insertBefore(node2, table.nextSibling);
    hideTablesBtn = document.getElementById("hideTables");

    //Hide the currently visible tables below the trace that are not required for most trace analysis
    toggleTablesVisibility(tables);
  }

  //(Re-) Apply eventlistener to the button
  hideTablesBtn.addEventListener("click", function () {
    toggleTablesVisibility(tables);
  }, false);

}

//Hide/show tables starting from a position
function toggleTablesVisibility(tables) {

  if (tables == null) {
    return;
  }

  //Hide/Show all tables except the first two
  for (i = 2; i < tables.length; i++) {

    var tableId = tables[i].id;

    if (tableId == "trace-table" || tableId == "skeleton") {
      continue;
    }

    tables[i].classList.toggle("hidden");
  }
}

//Add spinner to specified element
function addSpinner(e) {
  var spinner = document.createElement("span");
  spinner.classList.add("spinner");
  e.appendChild(spinner);
}

//Remove spinner from a specified element
function removeSpinner(e) {
  if (e == undefined) {
    return;
  }
  var spinner = e.querySelector(".spinner");
  if (spinner == undefined) {
    return;
  }
  spinner.remove();
}

//Separate whitespaces from text by splitting them into 2 span elements
function splitContent(td, string) {

  var inner = td.textContent;
  var split = inner.indexOf(string);
  var part1 = inner.slice(0, split);
  var part2 = inner.slice(split);

  var node1 = document.createElement("span");
  var node2 = document.createElement("span");

  node1.innerHTML = part1;
  node2.innerHTML = part2;

  //Store the nodes in a fragment to update in 1 go instead of once per part
  var fragment = document.createDocumentFragment();
  fragment.appendChild(node1);
  fragment.appendChild(node2);

  td.textContent = "";
  td.appendChild(fragment);

}

//Update the progress bar UI at the top of the screen
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

//Add line numbers to each line of the table that contains the actual trace
function addLineNumbers() {

  //Set the name of the column
  table.rows[1].cells[0].textContent = "#";

  //Update each line with the correct number
  for (i = 2; i < tl; i++) {
    table.rows[i].cells[0].textContent = i - 1 + ".";
  }
}

//Ensure that the width of the relevant columns in the trace is set so that the trace becomes more readable. It prevents undesired resizing based on the cell contents
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

//Wait for the skeleton element to be hidden
function waitForSkeletonToBeHidden() {
  return new Promise((resolve) => {
    function checkElement() {
      let skeleton = document.getElementById("skeleton-wrapper");

      if (skeleton.classList.contains("hidden")) {
        //console.log("The skeleton is now hidden.");
        resolve();

      } else {
        setTimeout(checkElement, 100);
      }
    }
    checkElement();
  });
}

//Scroll to any element and wait until the skeleton is hidden
async function scrollAfterWaiting(e, flashElement) {

  await waitForSkeletonToBeHidden();

  //console.log("Skeleton is gone.");

  setTimeout(() => {

    //Navigate to the element
    jumpToElement(e);

    //Shortly higlight the row
    addFlash(flashElement);

  }, 300); // <-- arbitrary number greater than the screen refresh rate
}