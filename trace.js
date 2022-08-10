//The second table contains the actual trace. I would prefer to use getElemetbyId(), but then someone has to ensure that there is an id :)
var table = document.getElementsByTagName("table")[1];

//If a table exists that potentially contains trace info
if (table != undefined) {
  //variable to store all buttonids for collapse / uncollapse all action
  var buttonids = [];
  //Ranking of all rows sorted from slowest to fastest
  var ranking = [];
  //Add two buttons to the DOM
  var node = document.createElement("div");
  node.id = "buttonwrapper";
  var button0 =
    "<button id='JumptoError' style='display:none'>Jump to error 🚨</button>";
  var button1 =
    "<button id='JumpToSlowest' style='display:none'>Jump to slowest 🐌</button>";
  var button2 =
    "<button id='collapseAll' class ='collapse' style='display:none'>&#9660; Collapse All</button>";
  var button3 =
    "<button id='buttontrigger' style=''>Enable Collapsing</button>";
  var button4 = "<button id='topten' style=''>Top ten slowest 🥇</button>";

  node.innerHTML = button3 + button2 + button0 + button1 + button4;
  document.body.insertBefore(node, document.body.firstChild);

  //Add eventlisteners as functions cannot be called from the buttons themselves. The buttons are on the DOM and cannot access the scope of this .js file

  document.getElementById("JumptoError").addEventListener("click", jumpToError);
  document
    .getElementById("JumpToSlowest")
    .addEventListener("click", jumpToSlowest);
  document
    .getElementById("buttontrigger")
    .addEventListener("click", addButtons);
  document
    .getElementById("collapseAll")
    .addEventListener("click", toggleCollapseExpandAll);
  document
    .getElementById("topten")
    .addEventListener("click", plotPerformanceTable);

  //Hide tables below the trace that are not required for most trace analysis
  if (hideTables()) {
    //Add a button to make them reappear if needed
    var node2 = document.createElement("div");
    var button = "<button id='hideTables'>More info</button>";
    node2.innerHTML = button;
    table.parentNode.insertBefore(node2, table.nextSibling);
    document.getElementById("hideTables").addEventListener("click", hideTables);
  }
  //Add buttons automatically if there are less than 30.000 rows
  //Adding buttons automatically for larger tables could otherwise lead to undesirable loading times
  if (table.rows.length < 30000) {
    addButtons();
  }
}

//Adds buttons to each collapsable row
function addButtons(evt) {
  console.log("Start adding buttons");
  console.time();
  document.getElementById("buttontrigger").disabled = true;
  document.getElementById("buttontrigger").innerHTML = "Enabling collapsing";
  if (evt != undefined) {
    var e = evt.target;
    e.disabled = true;
    addSpinner(e);
  }
  setTimeout(() => {
    //Array to store all pairs
    var pairs = [];

    //Add row ids to "starting"-elements.
    for (var i = 2; i < table.rows.length; i++) {
      //start from row 2 since the data starts there
      //Current table row element
      var tr = table.rows[i];
      //Second cel in row
      var t1 = tr.cells[1];
      //String in second cell
      var tsinner = t1.innerHTML;

      //if the cell is a "starting" cell
      if (tsinner.indexOf("Starting") > -1) {
        //Extract and save process id as element id
        var id = getID(tsinner);

        //is the id valid?
        if (id > 0) {
          //merge row id and process id to unique string
          var sid = "s" + tr.rowIndex + "_" + id;
          //set as element id
          tr.id = sid;
          //create a new pair for the row and the process id. The rowindex of the matchin "finish" element is left empty
          var pair = [tr.rowIndex, id, 0];
          //add it to the list of pairs
          pairs.push(pair);
        }
      }
    }

    //for each pair in the array
    for (h = 0; h < pairs.length; h++) {
      //only if the pair does not have a rowindex for the finish element yet
      if (pairs[h][2] == 0) {
        //get the process ID of the finish element that needs to be found
        var processIdStart = pairs[h][1];
        //find the next occurence of a pair with the same process id by searching backwards in the array
        for (i = pairs.length - 1; i >= 0; i--) {
          //has another pair been found with the same process id? //Result can also be the same as the pair on line 42
          //It should have no row index set for the finish element
          if (pairs[i][1] == processIdStart && pairs[i][2] == 0) {
            //this is the last occurence of the process id in the array
            var lastpairrowindex = pairs[i][0];

            var j = lastpairrowindex;
            //... We need to find a matching finish element for it now.
            //Start from the row index of the last pair since the finish element should appear later
            while (j < table.rows.length) {
              //Current table row element
              var tr = table.rows[j];
              //Second cel in row
              var t1 = tr.cells[1];
              //String in second cell
              var tsinner = t1.innerHTML;
              //contains the string "finished" and is not yet part of a pair because it does not have an id that starts with "f"?
              if (
                tsinner.indexOf("Finished") > -1 &&
                tr.id.indexOf("f") == -1
              ) {
                //Extract and save process id as element id
                var processIdFinish = getID(tsinner);
                //Are the process ids the same?
                if (processIdStart == processIdFinish) {
                  //create a unique string for the finish element so that the collapse function can find it
                  var fid = "f" + lastpairrowindex + "_" + processIdStart;
                  //set it as the id of the html element
                  tr.id = fid;
                  //store the row index of the found finished-element in the pair[]
                  pairs[i][2] = tr.rowIndex;
                  /*
                  console.log(
                    "Match found for process ID '" +
                      array[i][1] +
                      "' It will collapse from row '" +
                      array[i][0] +
                      "' until row'" +
                      array[i][2] +
                      "'"
                  );
                */

                  //Add a button to the start element of the pair
                  //create the unique id
                  var buttonid = lastpairrowindex + "_" + processIdStart;

                  //create a button
                  addButton(buttonid);
                }
              }
              //when a match has been found
              if (pairs[i][2] != 0) {
                //exit the loop to continue with the next pair[]
                j = table.rows.length;
              } //when no match was found
              else if (pairs[i][2] == 0) {
                //continue searching in the table next row until the last row of the table
                j++;
              }
            }
            //if the row index of the finish element could not be set after looking at the relevant table rows
            if (
              pairs[i][2] == 0 ||
              pairs[i][2] == undefined ||
              pairs[i][2] == null
            ) {
              console.log(
                "Could not find the finish element for s" +
                  pairs[i][0] +
                  "_" +
                  pairs[i][1]
              );
              //Get the cell of the failed process and highlight it red
              var unfinishedProcess = document.getElementById(
                "s" + pairs[i][0] + "_" + pairs[i][1]
              );
              unfinishedProcess.cells[1].style.color = "red";
              //set it to -1 to indicate that nothing was found
              pairs[i][2] = -1;
            }
          }
        }
      }
    }
    document.getElementById("buttontrigger").style.display = "none";
    //If collapsable elements exist, enable the UI elements
    if (buttonids.length > 0) {
      document.getElementById("collapseAll").setAttribute("style", "");
      document.getElementById("JumptoError").setAttribute("style", "");
      document.getElementById("JumpToSlowest").setAttribute("style", "");
    }
    console.log("Finished adding all buttons for collapsing");
    console.timeEnd();
    if (evt != undefined) {
      e.disabled = false;
      removeSpinner(e);
    }
  }, 20); // <-- arbitrary number greater than the screen refresh rate
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
  /*var span = document.getElementById(buttonid);
  span.addEventListener("click", toggleCollapseWrapper);
*/
  //Add the button id to an array that can be used for "Collapse/Expand all" actions
  buttonids.push(buttonid);

  //Add anchor at finish elemement to jump to start at TabelRowFinishCell (trfc)
  var trfc = document.getElementById("f" + buttonid).cells[1];

  splitContent(trfc, "F");
  var fspan2 = trfc.getElementsByTagName("span")[1];

  fspan2.classList.add("finish");

  fspan2.innerHTML = `${fspan2.innerHTML} <a href='#s${buttonid}'>Jump ${rowcount} rows up</a>`;

  //Highlight Success = False
  var successRowIndex = document.getElementById("f" + buttonid).rowIndex + 3;
  //console.log(successRowIndex);
  if (successRowIndex < table.rows.length) {
    var successCell = table.rows[successRowIndex].cells[1];
    //console.log(successCell.innerHTML);
    if (
      successCell.innerHTML.indexOf("False") > -1 ||
      successCell.innerHTML.indexOf("false") > -1
    ) {
      //enable jumpToError()
      successCell.classList.add("error");
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

//Triggers collapseExpandAll() and requires a button event as an input
function toggleCollapseExpandAll(evt) {
  console.log("Starting to collapse all");
  console.time();

  var e = evt.target;

  //disable the button to revent double clicks
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
  setTimeout(() => {
    collapseExpandAll(collapseExpand);

    removeSpinner(e);
    //Enable the button againí
    document.getElementById("collapseAll").disabled = false;
  }, 20); // <-- arbitrary number greater than the screen refresh rate

  //console.log("Finished collapsing all");
  console.timeEnd();
}

//Collapse all rows starting with the last. Input is either the string "collapse" or "expand".
function collapseExpandAll(collapseExpand) {
  var i = buttonids.length - 1;
  //Loop through the array of all buttons and "press" each button from bottom to top
  while (i >= 0) {
    toggleCollapse(buttonids[i], collapseExpand);
    i = i - 1;
  }
}

//Trigger toggleCollapse() for button eventlisteners
function toggleCollapseWrapper(evt) {
  var id = evt.target.id;
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
  var sid = "s" + id;
  var start = document.getElementById(sid);
  var startcell = start.cells[1].getElementsByTagName("span")[1];
  var startIndex = start.rowIndex;
  var rowcount = noOfRows(id);
  var collapsed = start.classList.contains("collapsed");
  //When collapseExpand is not used or when the enforced choice is the same as the automatic choice
  if (
    collapseExpand == null ||
    collapseExpand == undefined ||
    (collapseExpand == "collapse" && !collapsed) ||
    (collapseExpand == "expand" && collapsed)
  ) {
    if (!collapsed) {
      //switch the triangle
      startcell.innerHTML = "&#9658;" + startcell.innerHTML.slice(1);
      //Apply display none to all rows
      for (i = 1; i <= rowcount; i++) {
        //console.log("Loop "+ i +" of "+rowcount);
        //Current table row element
        var tr = table.rows[startIndex + i];
        //if the row is another starting row with collapsed children
        if (tr.classList.value.indexOf("collapsed") > -1) {
          tr.style.display = "none";
          //inrease i so that the children wont be collapsed again but skipped
          i = i + noOfRows(tr.id.substring(1));
          //console.log("Increased i to  " + i +" because of " + tr.id);
        } else {
          //Remove all inline styles and therfore show the row again
          tr.style.display = "none";
        }
      }
    } else if (collapsed) {
      //remove any applied styles
      start.setAttribute("style", "");
      //switch the triangle
      startcell.innerHTML = "&#9660;" + startcell.innerHTML.slice(1);
      //loop through all rows that should become visible again
      for (i = 1; i <= rowcount; i++) {
        //Current table row element
        var tr = table.rows[startIndex + i];
        //if the row is another starting row with collapsed children
        if (tr.classList.value.indexOf("collapsed") > -1) {
          tr.setAttribute("style", "");
          //inrease i so that the children wont be uncollapsed but skipped
          i = i + noOfRows(tr.id.substring(1));
        } else {
          //Remove all inline styles and therfore show the row again
          tr.setAttribute("style", "");
        }
      }
    }
    start.classList.toggle("collapsed");
  } //When the to be enforced option is already the status quo, nothing needs to happen.
  else if (
    (collapseExpand == "collapse" && collapsed) ||
    (collapseExpand == "expand" && !collapsed)
  ) {
    //console.log("Collapsing/Expanding was skipped");
  }
}

//Count the number of rows that are between a start and a finish element
function noOfRows(id) {
  var sid = "s" + id;
  var fid = "f" + id;

  //get start and finish element
  var start = document.getElementById(sid);
  var finish = document.getElementById(fid);
  //get positions
  var startIndex = start.rowIndex;
  var finishIndex = finish.rowIndex;

  var noOfRows = finishIndex - startIndex;
  return noOfRows;
}

//Highlight slow process actions by applying a gradiant color to the last cell and then jumping to the slowest one
function jumpToSlowest(evt) {
  jumpToSlowPos(evt, 0);
}

//Highlight slow process actions by applying a gradiant color to the last cell and then jumping to the slowest one
function jumpToSlowPos(evt, pos) {
  if (evt != undefined) {
    var e = evt.target;
    e.disabled = true; //disable the trigger element to prevent double clicks
    addSpinner(e);
  }

  setTimeout(() => {
    //If no max value has been identified yet and the process didn't run yet
    if (ranking[0] == undefined) {
      ranking = getRanking();
    }
    //Expand all rows first so that the slow row will be visible with 100% certanty
    collapseExpandAll("expand");

    slowposEl = document.getElementById(ranking[pos][1]);

    //Color the whole row in the color of the slow row element
    applyPerformanceStyle(slowposEl.parentElement.cells[1], ranking[0][0] * 10);

    slowposEl.scrollIntoView({
      block: "center",
    });

    if (evt != undefined) {
      e.disabled = false;
      removeSpinner(e);
    }
  }, 20); // <-- arbitrary number greater than the screen refresh rate
}

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

//Apply the color scale to a table cell depending on a calculated "fraction"
function applyPerformanceStyle(td, fraction) {
  //make font bold
  td.classList.add("performance");

  // if loadtime is 100ms or slower
  if (fraction <= 1) {
    //apply a background color (fraction of orange)
    /*td.style.cssText =
      "background-image: linear-gradient(to right, rgba(255, 165, 0, " +
      fraction +
      "),rgba(255, 165, 0, " +
      fraction +
      ")), linear-gradient(to right, #FFF, #FFF); font-weight: bolder";
*/
    var l = 50 + (50 - fraction * 50);

    td.style.cssText = "background: hsl(38, 100%, " + l + "%)";
  } else {

    //apply a background color (red) if it is slower than 100ms
    td.style.cssText = "background: rgb(255, 0, 0); font-weight: bolder";
    //Also switch to white text-color to ensure readability
    td.style.color = "white";
  }
}

//Plot the top ten of the slowest process actions in a table
function plotPerformanceTable() {
  //if the ranking table does not exist yet
  var el = document.getElementById("ranking");

  //If the table does not exist yet on the DOM
  if (el === null) {
    //If no max value has been identified yet and the process didn't run yet
    if (ranking.length <= 0) {
      ranking = getRanking();
    }

    var ptable = document.createElement("table");

    ptable.id = "ranking";

    for (i = 0; i <= 19; i++) {
      var ptr = ptable.insertRow(-1);
      var pcell0 = ptr.insertCell(-1);
      var pcell1 = ptr.insertCell(-1);
      var pcell2 = ptr.insertCell(-1);

      pcell0.innerHTML = i + 1 + ".";
      pcell1.innerHTML = ranking[i][0];

      var ael = document.createElement("a");
      ael.innerHTML = document
        .getElementById(ranking[i][1])
        .parentElement.cells[1].innerText.trim()
        .slice(0, 70);
      ael.addEventListener("click", scrollToSlowPos);
      pcell2.appendChild(ael);
    }

    document.body.insertBefore(ptable, document.body.firstChild);
  } else {
    el.classList.toggle("hidden");
  }
}

function scrollToSlowPos(evt) {
  var trigger = evt.target;
  var pos =
    parseInt(trigger.parentElement.parentElement.cells[0].innerText) - 1;
  var posID = ranking[pos][1];
  var el = document.getElementById(posID);

  applyPerformanceStyle(el.parentElement.cells[1], ranking[pos][0] * 10);
  el.scrollIntoView({
    block: "center",
  });
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
        "Success = false could not be found in this trace for any of the identified process components. However, please use CTRL + F just to double check :)"
      );
    } else {
      collapseExpandAll("expand");
      //Navigate to the element
      e.id = "firstError";
      e.scrollIntoView({
        block: "center",
      });
    }
    console.log("Will enable element e:" + el);
    el.disabled = false;
    removeSpinner(el);
  }, 20); // <-- arbitrary number greater than the screen refresh rate
}

//Hide the tables at the end of a trace that are barely used for analysis
function hideTables(evt) {
  var tables = document.querySelectorAll(".tracecontent>table");
  var i = 2;

  if (tables.length > 2) {
    if (evt == undefined) {
      while (i < tables.length) {
        tables[i].style.display = "none";
        i++;
      }
      return true;
    } else {
      var e = evt.target;
      if (e.classList.value.indexOf("hide") > -1) {
        while (i < tables.length) {
          tables[i].style.display = "none";
          i++;
        }
        e.classList.remove("hide");
      } else if (!e.classList.value.indexOf("hide") > -1) {
        while (i < tables.length) {
          tables[i].setAttribute("style", "");
          i++;
        }
        e.classList.add("hide");
      }
      return true;
    }
  } else {
    return false;
  }
}

function addSpinner(e) {
  var spinner = document.createElement("span");
  spinner.classList.add("spinner");
  e.appendChild(spinner);
}

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
