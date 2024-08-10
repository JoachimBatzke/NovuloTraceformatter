/*
This code helps developers and application owners of Novulo web applications to find and open the underlying components/models quickly.
*/
enableArchitectLinksIfNeeded();

function enableArchitectLinksIfNeeded() {

    /* GLOBAL RESOURCES */

    window.componentData = []; //Data about all components in the application. Is filled once in the beginning and then references for looking up the component names and numbers for a given GUID

    //The class name that is used to toggle CSS
    window.bodyClassName = 'enable-architect-links';

    //The query to select all elements that should get an architect link
    window.elementQuery = '.formrow, .gridpanel'

    /* SETUP */

    if (!document.body.classList.contains('fw38') && !document.body.classList.contains('fw39')) {
        console.warn('Cannot show architect links as the current website does neither seem to support the Novulo framework version 3.8 nor 3.9');
        return;
    }

    window.testMode = getTestModeURLParameter();
    window.currentMode = testMode ? 'show' : 'hide';
    window.nextMode = testMode ? 'hide' : 'show';

    //This could also be done by sideloading a CSS file with the extension, but as we have to inject CSS for iframes anyway, this ensures that only one CSS codebase exists
    ensureInjectedCustomCSS(document);

    ensureLinksToggleButton(nextMode); //Add the button that enables showing/hiding architect links for the next mode

    toggleAllBodyClasses(currentMode);

    if (testMode) { //If the testmode has already been applied, show architect links on the first page load

        // console.log("testmode = " + testMode + ". Will get data and start observing.");
        getComponentDataAndStartObserving();

    } else {

        /*DO NOTHING AND WAIT FOR TOGGLE BUTTON TO BE PRESSED */
    }

}

/* TOGGLE BUTTON */

//Ensure the correct button to show/hide architect links
function ensureLinksToggleButton(mode) {

    var id = "architect-link-button";

    var btn = document.getElementById(id);

    if (!btn) { //Button deos not yet exist in the DOM

        addLinksToggleButton(id, mode);

        addToggleButtonEventlistener(mode);

        return;
    }

    btn.innerText = (mode == 'show') ? "Show architect links" : "Hide architect links";

    addToggleButtonEventlistener(mode);
}

//Add a new button to the DOM
function addLinksToggleButton(id, mode) {

    const aboutnode = document.getElementById("about-link-button");

    //Insert the button right before the "About" node
    if (!aboutnode) {
        throw new Error("No architect links could be added as the current page is not a logged in Novulo application.");
    }

    //Example node
    //<a class="toolbar-button" id="architect-link-button">Reload and show architect links 🔗</a>

    var node = document.createElement("a");
    node.id = id;
    node.classList.add("toolbar-button");
    node.innerText = (mode == 'show') ? "Reload and " + mode + " architect links" : "Hide architect links";

    //Insert the button right before the "About" node
    aboutnode.parentNode.insertBefore(node, aboutnode);

    return;
}

//Apply eventlisteners based on the required mode to the button for showing/hiding the architect links
function addToggleButtonEventlistener(mode) {

    document.getElementById("architect-link-button").addEventListener("click", function () { toggleArchitectLinks(mode) });

}

//Toggle the URL parameter (if needed), the CSS class of the body element(s) and the label of the toggle button
function toggleArchitectLinks(mode) {

    var show = (mode == 'show');

    //If architect links should be shown but the URL parameter is not yet present
    if (show && !getTestModeURLParameter()) {

        //Reload the page and add the parameter
        setTestModeURLParameter(true);

        return; //The process will stop because of a page reload
    }

    //If architect links should be shown
    if (show) {

        //Reapply all eventlisteners
        //The wait time is reset when the function is called again. This should reduce the amount of executions of reApplyArchitectLinks()
        debounce(ensureAllArchitectLinks, 100);

    }

    toggleAllBodyClasses(mode);

    //Ensure the correct button for the next round.
    //It should be the inverse of the last button
    show ? ensureLinksToggleButton('hide') : ensureLinksToggleButton('show');
}

//Add/remove the CSS class to all body elements to hide/show architect links
function toggleAllBodyClasses(mode) {

    toggleBodyClass(document.body, mode);

    toggleAllBodyClassesforIFrames(mode);

}

//Toggle the class of a body based on the mode and the bodyClassName constant
function toggleBodyClass(body, mode) {
    mode == 'show' ? body.classList.add(bodyClassName) : body.classList.remove(bodyClassName);
}

//Search for iFrames toggle the class of each body within
function toggleAllBodyClassesforIFrames(mode) {

    getAllIframes().forEach(function (iframe) {
        toggleBodyClassforIFrame(iframe, mode);
    });

    //console.log('Toggled body class sucessfully for all iframes');
}

//Search for the body within an iframe and toggle its class
function toggleBodyClassforIFrame(iframe, mode) {

    // Access the iframe's document
    var iframeDocument = iframe.contentDocument || iframe.contentWindow.document;

    if (!iframeDocument) {
        console.log("No iframeDocument found");
        return;
    }

    // Select body  within the iframe
    var body = iframeDocument.querySelector('body');

    if (!body) {
        console.log("No body within iframeDocument found: " + iframeDocument);
        return;
    }

    toggleBodyClass(body, mode);

}

//Reload the current page with the url parameter "__testmode=" either set to "true" or "false"
function setTestModeURLParameter(bool) {

    if (getTestModeURLParameter() == bool) {
        return;
    }

    // Get the current URL wihtout any parameters
    var currentUrl = clearURLParameters(window.location.href);

    // Append "?__testmode=true" to the current URL
    var newUrl = currentUrl + '?__testmode=' + String(bool);

    // Reload the page with the new URL
    window.location.href = newUrl;
}

//Checks if the __testmode parameter is set to true, if not it is considered to be false
function getTestModeURLParameter() {
    // Get the current URL
    const currentURL = window.location.href;

    // Check if the URL contains the parameter "__testmode=true"
    return currentURL.includes('__testmode=true');
}

//Remove any parameters from a URL
function clearURLParameters(url) {
    var parser = document.createElement('a');
    parser.href = url;

    // Set the search (query string) part of the URL to an empty string
    parser.search = '';

    // Return the updated URL
    return parser.href;
}


/* ARCHITECT LINKS */

//Fetch component data and start watching for DOM changes if it succeeds
function getComponentDataAndStartObserving() {

    const url = clearURLParameters(window.location.href) + "?about=yes";

    fetchTableData(url)
        .then(data => {
            if (data) { //If data was retrieved sucessfully

                //console.log('Table data:', data);

                var body = document.body;

                //console.log("Adding a mutation observer to: " + body);

                addMutationObserver(body); //Watch for any changes in the body element

            } else {
                throw new Error('Failed to fetch component data from the "?about=yes" page. Therefore no architect links can be added.');
            }
        });
}

//Start watching for changes in the DOM. Any changes should trigger the application of new architect links
function addMutationObserver(targetNode) {

    // Create a MutationObserver instance
    var observer = new MutationObserver(handleMutations);

    // Configuration of the observer:
    var config = { childList: true, subtree: true };

    // Start observing the target node for configured mutations
    observer.observe(targetNode, config);

}

//Handle all DOM mutations that are seen by the mutation observer
function handleMutations(mutations) {

    //console.log("Saw a mutation.");
    mutations.forEach(handleMutation);

}

//Handle a single DOM mutation that is seen by the mutation observer
function handleMutation(mutation) {

    // Check if nodes were added
    if (!(mutation.type === 'childList' && mutation.addedNodes.length > 0)) {
        return;
    }

    // Call function for each added node
    mutation.addedNodes.forEach(handleNode);

}

//Handle the actions for a single changed node
function handleNode(changedNode) {

    var id = changedNode.id;

    if (id == "cursor_box_js") {
        return;
    }

    if (id == "cursor_box_content") {
        return;
    }

    var classlist = changedNode.classList;

    if (!classlist == undefined) {

        if (classlist.contains("architect-link")) {
            return;
        }

    }

    /* FOR DEBUGGING
    if (classlist.contains("highlight")) {
        return;
    }
    console.log(classlist);
    changedNode.classList.add("highlight");
    */

    //Reapply the architect links only after a wait time of 300ms.
    //The wait time is reset when the function is called again. This should reduce the amount of executions of reApplyArchitectLinks()
    //console.log("Reapplying architect links.");
    debounce(ensureAllArchitectLinks, 300);

}

let timeoutId;

//Standard debounce function to improve performance and reduce unneccessary load by redundant execution of functions
function debounce(callback, delay) {

    //console.log("Debouncing with a delay of " + delay);
    clearTimeout(timeoutId);
    timeoutId = setTimeout(callback, delay);
}

//Add new links if needed
function ensureAllArchitectLinks() {

    ensureArchitectLinksForDocument(document);

    //console.log('Reapplied architect links sucessfully to the body');
    ensureArchitectLinksToElementsOfIframes();

}

//Add new links to a document
function ensureArchitectLinksForDocument(doc) {

    // Get all relevant elements for applying architect links
    var unfilteredElements = doc.body.querySelectorAll(elementQuery);

    //console.log("Found " + unfilteredElements.length + " elements.");

    if (unfilteredElements.length == 0) {
        //console.log("No formrows within " + doc.body + " found");
        return;
    }

    //This could also be done by sideloading a CSS file with the extension, but as we have to inject CSS for iframes anyway, this ensures that only one CSS codebase exists
    ensureInjectedCustomCSS(doc);

    var els = getElementsWithoutLink(unfilteredElements);

    //onsole.log("Found " + els.length + " elements without links:");
    //console.log(els);
    if (els.length == 0) { return; }

    //Add new links to the body
    initializeArchitectLinks(els);

    //(Re-)load cursor_box.js for current document
    applyCursorBoxJS(doc);

}

//Get all iframes or return []
function getAllIframes() {

    var iframes = document.querySelectorAll('.k-window-iframecontent .k-content-frame');

    //No iframes in the DOM?
    if (iframes.length == 0) {
        //console.log("No iframes found");
        return [];
    }

    return iframes;
}

//Search for iFrames and apply Architect links to each
function ensureArchitectLinksToElementsOfIframes() {

    getAllIframes().forEach(function (iframe) {
        reApplyArchitectLinksToElementsOfIframe(iframe);
    });

    //console.log('Reapplied architect links sucessfully to the iframes');
}

//Search for formrows in an iframe and apply architect links
function reApplyArchitectLinksToElementsOfIframe(iframe) {

    // Access the iframe's document
    var iframeDocument = iframe.contentDocument || iframe.contentWindow.document;

    if (!iframeDocument) {
        //console.log("No iframeDocument found");
        return;
    }

    //Set the class at the iframe body if it is set at the main body
    if (document.body.classList.contains(bodyClassName)) {
        toggleBodyClass(iframeDocument.body, 'show');
    }

    ensureArchitectLinksForDocument(iframeDocument);

}

//Inject custom CSS to the ifram as it cannot acces the CSS of the parent scope
function ensureInjectedCustomCSS(myDocument) {

    var id = "architect_links_css";

    //Exit if custom CSS has already been applied
    if (myDocument.getElementById(id)) {
        return;
    }
    // Create a new link element
    var link = document.createElement('link');
    link.rel = "stylesheet";
    link.id = id;

    var scriptURL = getExtensionURLforFilename('architect_links.css');

    //console.log("The css file was found at: " + scriptURL);

    // Set the href attribute to the URL of the bundled CSS file
    link.href = scriptURL;
    // Append the script to the document body
    myDocument.body.appendChild(link);
    //console.log('Sucessfully injected ' + id);

}

//Get the file path for a file within the bundled extension
function getExtensionURLforFilename(filename) {

    if (typeof browser !== 'undefined' && browser.runtime && browser.runtime.getURL) {
        // Firefox
        return browser.runtime.getURL(filename);

    } else if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
        // Chrome
        return chrome.runtime.getURL(filename);

    } else {
        // Handle unsupported browsers
        console.error('Unsupported browser. Cannot locate "architect_links.css".');
    }
}

//Remove all outdated architect links from the DOM
function getElementsWithoutLink(elements) {

    var newElements = [];

    //loop through all elements (probably a list of fromrows and gridpanels)
    elements.forEach(element => {

        // Get all elements with class 'formrow' within
        var es = element.querySelectorAll('.architect-link');

        if (es.length == 0) {
            newElements.push(element);
        }

    })

    return newElements;
}

//Add all new architect links to the DOM
function initializeArchitectLinks(elements) {

    // Add link to each element
    elements.forEach(element => {

        // Get the sourcestructureid attribute value
        var sourceStructureIdEL = element.querySelector('[sourcestructureid]');

        if (!sourceStructureIdEL) {
            //If there is no child element with a sourcestructureid, then maybe the element itself has the attribute
            sourceStructureIdEL = element;
        }

        var sourceStructureId = sourceStructureIdEL.getAttribute('sourcestructureid');

        if (sourceStructureId == null) {
            return;
        }

        addArchitectLink(sourceStructureId, element);
    });
}

//Add a single architect link to a an element (formrow)
function addArchitectLink(sourceStructureId, element) {

    //Store the JSON object with the info about the component
    var component = getComponentForStructureID(sourceStructureId);
    var revisionString = component.revision ? " r" + component.revision : ""; //If a revision is known, add it to the link
    var mNumber = "M" + component.number + revisionString;
    var title = component.title;
    var titleAndMNumber = mNumber + " " + title;

    // Add click event to the left section of the formrow
    var architectLink = document.createElement('div');
    architectLink.classList.add('architect-link');

    architectLink.innerText = titleAndMNumber;
    //architectLink.title = title;

    var jsonData = {
        "mNumber": mNumber,
        "title": title
    }
    architectLink.setAttribute('data-json', JSON.stringify(jsonData));

    architectLink.addEventListener('click', openArchitect(sourceStructureId));

    //Add the link icon as a span element
    var icon = document.createElement('span');
    icon.classList.add('n-framework-icon');
    icon.classList.add('icon');
    architectLink.appendChild(icon);

    // Append clickable area to the formrow or gripanel
    element.insertBefore(architectLink, element.firstChild);
    //element.title = titleAndMNumber;

}

//Open the Novulo architect for specific component (and revision)
function openArchitect(sourceStructureId) {
    return function () {
        var url = getArchitectUrl(sourceStructureId);
        console.log("Will open the url: " + url);
        // Open URL
        window.location.href = url;
    };
}

//Get the right url to open the Novulo architect for specific component (and revision)
function getArchitectUrl(sourceStructureId) {
    //console.log(sourceStructureId);
    var component = getComponentForStructureID(sourceStructureId);
    var revisionString = component.revision ? "/" + component.revision : ""; //If a revision is known, add it to the link
    url = "novulo-architect:appserver/" + component.number + revisionString + "?readonly=1"
    return url;
}

//Get the item of the component data JSON for a structure ID
function getComponentForStructureID(sourceStructureId) {
    var guid = stripAfterColon(sourceStructureId);
    //console.log(guid);
    return getComponentForGuid(guid);
}

//Remove any part of a string after ":" including the colon itself
function stripAfterColon(str) {
    var colonIndex = str.indexOf(':');
    if (colonIndex !== -1) {
        return str.substring(0, colonIndex); // Also remove the ":" character
    } else {
        return str; // If ":" is not found, return the original string
    }
}

//Retrieve the component for a given guid
function getComponentForGuid(guid) {
    const component = componentData.find(item => item.guid === guid);
    return component ? component : console.error("No component was found for guid " + guid);
}

/* GET COMPONENT DATA */

//Fetch the component table data from the URL "?about=yes" and convert it to JSON
async function fetchTableData(url) {
    try {
        //throw new Error("This is a manually triggered error");

        // Fetch the HTML content from the URL
        const response = await fetch(url);
        const html = await response.text();

        // Create a temporary div element to parse the HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;

        // Find the table element that contains component data
        var divWithComponentsDataKey = tempDiv.querySelector('div[data-key="Components"]');
        const tableElement = divWithComponentsDataKey.querySelector('table');

        if (!tableElement) {
            throw new Error('Table with component data has not been found at url ' + url + '.');
        }

        // Convert the table rows to an array of objects
        const tableRows = tableElement.querySelectorAll('tr');

        // Extract headers from the first row
        const headers = Array.from(tableRows[0].querySelectorAll('th')).map(th => th.textContent.trim().toLowerCase());

        // Iterate over the table rows starting from the second row (index 1)
        convertTableToJSON(tableRows, headers);

        // Return the JSON object containing the table data
        return componentData;

    } catch (error) {
        console.error('Error fetching table data:', error);
        return null;
    }

    function convertTableToJSON(tableRows, headers) {
        for (let i = 1; i < tableRows.length; i++) {
            const rowData = {};
            const tableCells = tableRows[i].querySelectorAll('td');

            // Iterate over the table cells
            convertCellsToJSON(headers, tableCells, rowData);

            componentData.push(rowData);
        }
    }

    function convertCellsToJSON(headers, tableCells, rowData) {
        for (let j = 0; j < headers.length && j < tableCells.length; j++) {

            var cellContent = tableCells[j].textContent.trim();

            if (j == 0) { //The first column is the name column. its values need to be split up into 2 seperate columns
                // Split the string by "-"
                const parts = cellContent.split(" - ");

                // Extract the number and name
                const number = parts[0].substring(1); // Remove the "M" from the number
                const title = parts[1];
                rowData["number"] = number;
                rowData["title"] = title;
            } else {

                rowData[headers[j]] = cellContent;
            }
        }
    }
}


/* CURSOR BOX WITH ADDITIONAL FIELD INFO */

//Run the code to enable the display of the cursor box
function applyCursorBoxJS(myDocument) {

    ensureCursorBox(myDocument);

    listenToMouseMovements(myDocument);

    listenForCTRL(myDocument);

    injectCursorBoxJS(myDocument);

}

//Make sure that the required HTML is in the DOM
function ensureCursorBox(myDocument) {

    var id = 'cursor-box';

    if (myDocument.getElementById(id) != null) {
        return;
    }

    // Create the cursor box element
    var cursorBox = myDocument.createElement('div');
    cursorBox.id = id;
    // Append the cursor box to the body
    myDocument.body.appendChild(cursorBox);
}

//Let the cursor box HTML follow the mouse movements if it is visible
function listenToMouseMovements(myDocument) {

    var cursorBox = myDocument.getElementById('cursor-box');

    // Offset the box slightly to make sure it doesn't cover the cursor
    var offsetX = 10;
    var offsetY = 10;

    myDocument.addEventListener('mousemove', handleMouseMove());

    function handleMouseMove() {
        return function (e) {

            if (!cursorBox.classList.contains('show') || cursorBox.classList.contains('freeze')) {
                return;
            }

            var x = e.clientX;
            var y = e.clientY;

            // Set the position of the box
            cursorBox.style.left = (x + offsetX) + 'px';
            cursorBox.style.top = (y + offsetY) + 'px';
        };
    }
}

//Trigger the JS script for filling the cursor box with the correct info, within the right body
function injectCursorBoxJS(myDocument) {

    var name = 'cursor_box';

    var id = name + '_js';

    var oldScript = myDocument.getElementById(id);

    if (oldScript != undefined) {
        oldScript.remove();
    }

    // Create a script element
    var script = myDocument.createElement('script');

    script.id = id;

    var scriptURL = getExtensionURLforFilename(name + '.js');
    // Set the src attribute to the URL of your bundled JavaScript file
    script.src = scriptURL;
    // Append the script to the document body
    myDocument.body.appendChild(script);

    //console.log('Sucessfully injected ' + name + '.js');
}

//Flag to track whether the CTRL key has already been pressed earlier
let ctrlKeyPressed = false;

//Function to handle the event when Ctrl key is pressed
function handleCtrlKey(event, myDocument) {

    if (!architectLinksEnabled()) {
        return;
    }

    // Check if the Ctrl key is still pressed
    if (!event.ctrlKey || ctrlKeyPressed) {
        return;
    }

    // console.log('CTRL down');

    var cursorBox = myDocument.getElementById('cursor-box');

    cursorBox.classList.add('freeze');

    // Set the flag to true to indicate that the action has been executed
    ctrlKeyPressed = true;

}

//Function to handle the event when Ctrl key is released
function handleCtrlKeyRelease(myDocument) {

    if (!architectLinksEnabled()) {
        return;
    }

    // Check if the Ctrl key is released
    if (!ctrlKeyPressed) {
        return;
    }

    // Reset the flag when the Ctrl key is released
    ctrlKeyPressed = false;

    var cursorBox = myDocument.getElementById('cursor-box');
    cursorBox.classList.remove('freeze');
    cursorBox.classList.remove('show');
}

//Return a bool for if architectlinks are enabled or not according to a class in the DOM
function architectLinksEnabled() {
    return document.body.classList.contains(bodyClassName);
}

//Listen for CTRL key events to freeze/unfreeze the cursor box
function listenForCTRL(myDocument) {

    // Add event listeners for keydown and keyup events
    myDocument.addEventListener('keydown', function (event) {
        handleCtrlKey(event, myDocument);
    });

    myDocument.addEventListener('keyup', function (event) {
        handleCtrlKeyRelease(myDocument);
    });

}
