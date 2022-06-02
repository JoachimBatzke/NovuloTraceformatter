//the second table contains the actual trace.
//I would prefer to use getElemetbyId(), but then someone has to ensure that there is an id :)
var table = document.getElementsByTagName("table")[1];
//variable to store all buttonids for collapse / uncollapse all action
var buttonids = [];
//Add two buttons to the DOM
var node = document.createElement("div");
node.id = "buttonwrapper";
var button1 = "<button id='performancetrigger'>Jump to slowest</button>";
var button2 =
  "<button id='collapseAll' class ='collapse' style=''>Collapse All</button>";
var button3 = "<button id='buttontrigger' style=''>Enable Collapsing</button>";

node.innerHTML = button3 + button2 + button1;
document.body.insertBefore(node, document.body.firstChild);

//Add eventlisteners as functions cannot be called from the buttons themselves. The buttons are on the DOM and cannot access the scope of this .js file
document
  .getElementById("performancetrigger")
  .addEventListener("click", jumpToSlowest);
document.getElementById("buttontrigger").addEventListener("click", addButtons);
document
  .getElementById("collapseAll")
  .addEventListener("click", toggleCollapseAll);

//Add buttons automatically if there are less than 30.000 rows
//Adding buttons automatically for larger tables could otherwise lead to undesirable laoding times
if (table.rows.length < 30000) {
  addButtons();
}

//Adds buttons to each collapsable row
function addButtons() {
  console.log("Start adding buttons");
  console.time();
  document.getElementById("buttontrigger").disabled = true;
  document.getElementById("buttontrigger").innerHTML = "Enabling collapsing...";

  var array = [];

  //Add row ids to "starting"-elements. start from row 2 since the data starts there
  for (var i = 2; i < table.rows.length; i++) {
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
        array.push(pair);
      }
    }
  }

  //for each pair in the array
  for (h = 0; h < array.length; h++) {
    //only if the pair does not have a rowindex for the finish element yet
    if (array[h][2] == 0) {
      //get the process ID of the finish element that needs to be found
      var processIdStart = array[h][1];
      //find the next occurence of a pair with the same process id by searching backwards in the array
      for (i = array.length - 1; i >= 0; i--) {
        //has another pair been found with the same process id? //Result can also be the same as the pair on line 42
        //It should have no row index set for the finish element
        if (array[i][1] == processIdStart && array[i][2] == 0) {
          //this is the last occurence of the process id in the array
          var lastpairrowindex = array[i][0];

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
            if (tsinner.indexOf("Finished") > -1 && tr.id.indexOf("f") == -1) {
              //Extract and save process id as element id
              var processIdFinish = getID(tsinner);
              //Are the process ids the same?
              if (processIdStart == processIdFinish) {
                //create a unique string for the finish element so that the collapse function can find it
                var fid = "f" + lastpairrowindex + "_" + processIdStart;
                //set it as the id of the html element
                tr.id = fid;
                //store the row index of the found finished-element in the pair[]
                array[i][2] = tr.rowIndex;
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
            if (array[i][2] != 0) {
              //exit the loop to continue with the next pair[]
              j = table.rows.length;
            } //when no match was found
            else if (array[i][2] == 0) {
              //continue searching in the table next row until the last row of the table
              j++;
            }
          }
          //if the row index of the finish element could not be set after looking at the relevant table rows
          if (
            array[i][2] == 0 ||
            array[i][2] == undefined ||
            array[i][2] == null
          ) {
            console.log(
              "Could not find the finish element for s" +
                array[i][0] +
                "_" +
                array[i][1]
            );
            //Get the cell of the failed process and highlight it red
            var unfinishedProcess = document.getElementById(
              "s" + array[i][0] + "_" + array[i][1]
            );
            unfinishedProcess.cells[1].style.color = "red";
            //set it to -1 to indicate that nothing was found
            array[i][2] = -1;
          }
        }
      }
    }
  }
  document.getElementById("buttontrigger").style.display = "none";

  console.log("Finished adding all buttons for collapsing");
  console.timeEnd();
}

//Add a single button to a specific collapsable cell
function addButton(buttonid) {
  //trs = TableRowStartElement
  trs = document.getElementById("s" + buttonid);
  // Get first cell in the row...
  var t0 = trs.cells[0];
  //... determine the no of rows to be collapsed...
  var rowcount = noOfRows(buttonid);
  //...to add a button with a descriptive label and an utf8-triangle
  t0.innerHTML = `<button id="${buttonid}">&#9660; ${rowcount}</button>`;
  var btn = document.getElementById(buttonid);
  btn.addEventListener("click", toggleCollapseWrapper);

  //Add the button id to an array that can be used for "Collapse/Expand all" actions
  buttonids.push(buttonid);

  //Add anchor at finish elemement to jump to start
  //trfc TabelRowFinishCell0
  var trfc = document.getElementById("f" + buttonid).cells[1];
  trfc.innerHTML = `${trfc.innerHTML} <a href='#s${buttonid}'>Jump ${rowcount} rows up</a>`;

  //TODO
  //Highlight Return = False
  var successRowIndex = document.getElementById("f" + buttonid).rowIndex + 3;
  console.log(successRowIndex);
  if (successRowIndex < table.rows.length) {
    var successCell = table.rows[successRowIndex].cells[1];

    if (successCell.innerHTML.indexOf("success = false") > -1) {
      successCell.style.color = "red";
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

//collapse all rows starting with the last
function toggleCollapseAll(evt) {
  console.log("Starting to collapse all");
  console.time();

  //disable the button to revent double clicks
  document.getElementById("collapseAll").disabled = true;

  //set the variable that will be passed to toggleCollapse()
  var collapseExpand = "";
  //If the button is set to collapse all
  if (evt.target.classList.contains("collapse")) {
    collapseExpand = "collapse";
    //Update the button label
    evt.target.innerHTML = "Expand all";
  } else {
    //If the button is set to collapse all
    collapseExpand = "expand";
    //Update the button label
    evt.target.innerHTML = "Collapse all";
  }
  evt.target.classList.toggle("collapse");

  var i = buttonids.length - 1;
  //Loop through the array of all buttons and "press" each button from bottom to top
  while (i >= 0) {
    toggleCollapse(buttonids[i], collapseExpand);
    i = i - 1;
  }
  //Enable the button again
  document.getElementById("collapseAll").disabled = false;

  //console.log("Finished collapsing all");
  console.timeEnd();
}

//Trigger toggleCollapse() for button eventlisteners
function toggleCollapseWrapper(evt) {
  var id = evt.target.id;
  toggleCollapse(id);
}

//Collapse or expand rows
function toggleCollapse(id, collapseExpand) {
  var sid = "s" + id;
  var start = document.getElementById(sid);
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
      //switch the label of the button
      start.cells[0].firstChild.innerHTML = "&#9658; " + rowcount;
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
      //switch the label of the button
      start.cells[0].firstChild.innerHTML = "&#9660; " + rowcount;
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
    console.log("Collapsing/Expanding was skipped");
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
function jumpToSlowest() {
  //If no max value has been identified yet and the process didn't run yet
  if (document.getElementById("maxval") == undefined) {
    var th;
    var maxval = 0;
    var maxEl;
    var fraction = 0.0;

    //start from row 2 since the data starts there
    for (var i = 2; i < table.rows.length; i++) {
      //get the cell of the column "from last(s)"
      th = table.rows[i].cells[3];

      //Parse the string to a flaot and increase the fraction/opacity by 10 so that an action that takes 100ms becomes 100% orange
      fraction =
        parseFloat(th.innerHTML.replace(",", ".").replace(" ", "")) * 10;

      // if loadtime is 100ms or slower
      if (fraction <= 1) {
        //apply a background color (fraction of orange)
        th.style.cssText =
          "background-image: linear-gradient(to right, rgba(255, 165, 0, " +
          fraction +
          "),rgba(255, 165, 0, " +
          fraction +
          ")), linear-gradient(to right, #FFF, #FFF)";
      } else {
        //apply a background color (red) if it is slower than 100ms
        th.style.cssText = "background: rgb(255, 0, 0)";
        //Also switch to white text-color to ensure readability
        th.style.color = "white";
      }
      //update the max value variable if the current value is higher than any previous value
      if (maxval < fraction) {
        maxval = fraction;
        //store the cell element with the max value
        maxEl = th;
      }
    }

    //Give the element with the highest fraction the id "maxval" to make it accesable for anchors
    maxEl.id = "maxval";

    /* // OLD: Add a link to the top cell of a trace to jump to the slowest. Has been replaced by a button with a fixed position
    table.getElementsByTagName("h3")[0].style.cssText = "display:inline-block";
    table.rows[0].cells[0].innerHTML =
      table.rows[0].cells[0].innerHTML +
      "<a href='#maxval' style='line-height:50px;display:inline-block; color:white; float:right; padding-right:20px'>Jump to slowest</a>";
      */
  }
  window.location.href = "#maxval";
}
