/*
This code helps developers and application owners of Novulo web applications to find and open the underlying components/models of an a webapplication quickly.
*/

//Global variables
var componentData = []; //Data about all components in the application

//Is required for injection into iFrames
const customCss = '.architect-link {  display: none;}.enable-architect-links .formrow:hover .architect-link,.enable-architect-links .gridpanel:hover .architect-link  {  z-index: 1000000;  background-color: white;  height: 24px;  text-indent: 30px;  position: absolute;    border-radius: 3px;  background-position: -18px -3138px;  display: block;  line-height: 24px;  padding-right: 4px;  color: rgba(33, 46, 63, 1);  box-shadow:    0px 2px 4px -1px rgba(0, 0, 0, .2),    0px 4px 5px 0px rgba(0, 0, 0, .14),    0px 1px 10px 0px rgba(0, 0, 0, .12);}.enable-architect-links .formrow:hover .architect-link {  left: 0px;}.enable-architect-links .gridpanel:hover .architect-link {  left: 8px;  top: 8px;}.enable-architect-links .formrow .architect-link:hover,.enable-architect-links .gridpanel .architect-link:hover {  cursor: pointer;  background-color: #e9eaec;  /* .1 on a white bg */  user-select: none;}.enable-architect-links .formrow .architect-link:active,.enable-architect-links .gridpanel .architect-link:active {  background-color: #d3d5d9;  /* .2 on a white bg */}#architect-link-button:hover {  cursor: pointer;}';

//The class name that is used to toggle CSS
const bodyClassName = 'enable-architect-links';

//The query to select all elements that should get an architect link
const elementQuery = '.formrow, .gridpanel'

/* SETUP */

if (!document.body.classList.contains('fw38')) {
    throw new Error('Cannot show architect links as the current website does not seem to support the Novulo 3.8 framework.');
}

const testMode = getTestModeURLParameter();
const currentMode = testMode ? 'show' : 'hide';
const nextMode = testMode ? 'hide' : 'show';

ensureLinksToggleButton(nextMode); //Add the button that enables showing/hiding architect links for the next mode

toggleAllBodyClasses(currentMode);

if (testMode) { //If the testmode has already been applied, show architect links on the first page load

    getComponentDataAndStartObserving();

} else {

    /*DO NOTHING AND WAIT FOR TOGGLE BUTTON TO BE PRESSED */
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

//Add a new button to toggle architect links to the DOM
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

//Toggle the URL parameter, the CSS and the buttons
function toggleArchitectLinks(mode) {

    var show = (mode == 'show');

    //If architect links should be shown but the URL parameter is not yet present
    if (show && !getTestModeURLParameter()) {

        //Reload the page and add the parameter
        setTestModeURLParameter(true);

        return; //The process will stop because of a page reload
    }

    toggleAllBodyClasses(mode);

    //Ensure the correct button for the next round. It should be the inverse of the last button
    show ? ensureLinksToggleButton('hide') : ensureLinksToggleButton('show');
}

//Add or remove the CSS class to hide/show architect links
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
    var newUrl = currentUrl + (currentUrl.indexOf('?') !== -1 ? '&' : '?') + '__testmode=' + String(bool);

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
            // Select the target node
            var targetNode = document.body; //was getElementById('window-content-pane')

            if (data) {
                //console.log('Table data:', data);
                addMutationObserver(targetNode);
            } else {
                
                throw new Error('Failed to fetch component data from the "?about=yes" page. Therefore no architect links can be added.');
              
            }
        });
}

//Start watching for changes in the DOM. Any changes should trigger the application of new architect links
function addMutationObserver(targetNode) {

    // Create a MutationObserver instance
    var observer = new MutationObserver(handleMutations());

    // Configuration of the observer:
    var config = { childList: true, subtree: true };

    // Start observing the target node for configured mutations
    observer.observe(targetNode, config);

}

//Handle all DOM mutations that are seen by the mutation observer
function handleMutations() {

    return function (mutations) {
        mutations.forEach(handleMutation());
    };
}

//Handle a single DOM mutation that is seen by the mutation observer
function handleMutation() {
    return function (mutation) {

        // Check if nodes were added
        if (!(mutation.type === 'childList' && mutation.addedNodes.length > 0)) {
            return;
        }

        // Call function for each added node
        mutation.addedNodes.forEach(handleNode());
    };
}

//Handle the actions for a single new node
function handleNode() {
    return function (addedNode) {
        var classlist = addedNode.classList;

        if (classlist == undefined) {
            return;
        }

        if (addedNode.classList.contains("architect-link")) {
            return;
        }

        //Reapply the architect links only after a wait time of 300ms.
        //The wait time is reset when the function is called again. This should reduce the amount of executions of reApplyArchitectLinks()
        debounce(reApplyArchitectLinks, 300);
    };
}

let timeoutId;
//Standard debounce function to improve performance and reduce unneccessary load by redundant execution of functions
function debounce(callback, delay) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(callback, delay);
}

//Remove old links if the exist and initialize new ones
function reApplyArchitectLinks() {

    // Get all relevant elements for applying architect links
    var bodyElements = document.body.querySelectorAll(elementQuery);

    //This could also be done by sideloading a CSS file with the extension, but as we have to inject CSS for iframes anyway, this ensures that only one CSS codebase exists
    injectCustomCSS(document);

    //Just to be sure, remove old links that could otherwise mess up the application of new links
    removeOldLinks(bodyElements);

    //Add new links to the body
    initializeArchitectLinks(bodyElements);

    //console.log('Reapplied architect links sucessfully to the body');
    reApplyArchitectLinksToElementsOfIframes();

}

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
function reApplyArchitectLinksToElementsOfIframes() {

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

    // Select formrows within the iframe
    var elementsWithinIframe = iframeDocument.querySelectorAll(elementQuery);

    if (elementsWithinIframe.length == 0) {
        //console.log("No formrows within iframeDocument found: " + iframeDocument);
        return;
    }

    //Inject custom CSS since the iFrame can't acces the CSS in the parent scope
    injectCustomCSS(iframeDocument);

    //Set the class at the iframe body if it is set at the main body
    if (document.body.classList.contains(bodyClassName)) {
        toggleBodyClass(iframeDocument.body, 'show');
    }

    //Remove any old links to prevent errors if some DOM mnaipulation caused the old links to break
    removeOldLinks(elementsWithinIframe);

    //Add new Architect links to the formrows
    initializeArchitectLinks(elementsWithinIframe);
}

//Inject custom CSS to the ifram as it cannot acces the CSS of the parent scope
function injectCustomCSS(myDocument) {

    var id = "architectLinksCss";

    //Exit if custom CSS has already been applied
    if (myDocument.getElementById(id)) {
        return;
    }

    // Create a <style> element
    var style = myDocument.createElement('style');
    style.id = id;
    style.type = 'text/css';

    // Define custom CSS rules
    var css = customCss;

    // Append the CSS rules to the <style> element
    if (style.styleSheet) {
        // For IE
        style.styleSheet.cssText = css;
    } else {
        style.appendChild(myDocument.createTextNode(css));
    }

    // Append the <style> element to the iframe document's <head>
    myDocument.head.appendChild(style);
}

//Remove all outdated architect links from the DOM
function removeOldLinks(elements) {

    //return;
    //loop through all elements (probably a list of fromrows)
    elements.forEach(element => {

        //console.log(element);

        // Get all elements with class 'formrow'
        var es = element.querySelectorAll('.architect-link');

        es.forEach(e => {
            e.remove();
        })
    })
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
    architectLink.classList.add('n-framework-icon');
    architectLink.style.height = this.offsetHeight + 'px'; // Height of the clickable area  
    architectLink.innerText = mNumber;
    architectLink.title = title;
    architectLink.addEventListener('click', openArchitect(sourceStructureId));


    // Append clickable area to the formrow or gripanel
    element.insertBefore(architectLink, element.firstChild);
    element.title = titleAndMNumber;

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
