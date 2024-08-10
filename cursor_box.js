
var cursorBox = document.getElementById('cursor-box');

if (cursorBoxIsEnabled()) {
    addEventListenersToElementContainers();
}

//Determine whether or not the cursor box is enabled
function cursorBoxIsEnabled() {

    var enabled = document.body.classList.contains('enable-architect-links');

    //Have architect links been enabled by the architect_links.js script?
    if (enabled == false) {
        return false;
    }

    //Has cursor box been ensured sucessfully already by the architect_links.js script?
    if (cursorBox == undefined) {
        return false
    };

    //Only if the cursor box is not frozen (CTRL key is pressed) then it is enabled and can be updated
    return !cursorBox.classList.contains('freeze');
}

//Add mouseenter and mouse leave events to HTML elements where a cursorbox should appear
function addEventListenersToElementContainers() {

    // Remove existing event listeners first
    removeEventListenersFromElementContainers();

    var els = document.getElementsByClassName('elementcontainer');

    for (var i = 0; i < els.length; i++) {

        els[i].addEventListener('mouseenter', populateCursorBox());

        els[i].addEventListener('mouseleave', hideCursorBox());
    }
}

//Remove all previously added eventlisteners to prevent double eventlisteners
function removeEventListenersFromElementContainers() {
    var els = document.getElementsByClassName('elementcontainer');
    for (var i = 0; i < els.length; i++) {
        els[i].removeEventListener('mouseenter', populateCursorBox);
        els[i].removeEventListener('mouseleave', hideCursorBox);
    }
}

//Fill the cursor box with the relevant info based on its context/trigger
function populateCursorBox() {
    return function (event) {

        if (!cursorBoxIsEnabled()) {
            return;
        }

        var hoveredElement = event.target;

        var componentJSON = getComponentJsonFromArchitectLink(hoveredElement);

        if (componentJSON == null) {
            return;
        }

        //Get the Novulo framework specific additional info for the elementcontainer
        var options = getOptionsNode(hoveredElement);

        if (options == null) {
            return;
        }

        var fieldname = (options['contextName'] == null) ? '<span class="info">No information available</span>' : options['contextName'];

        var type = options['typename'];
        var TypeOrRecordlabel = "Type";

        //Add info about the record type and id for searchlinks if possible
        if (options.onclicktask != undefined) {
            var pageLoadString = options.onclicktask.process.parameters.page;

            if (pageLoadString != undefined) { //TODO TEST
                //Get the record type and its ID that will be openend when clicking on it
                var recordStringWithID = pageLoadString.substring(pageLoadString.indexOf('[<"record"') + 11, pageLoadString.indexOf('>]'));
                type = recordStringWithID;
                TypeOrRecordlabel = "Record";
            }
        }

        if (type == undefined) {
            type = 'unknown';
        }

        //Set the parent record and its id
        var parentRecord = getParentRecordString();

        //As a fallback try to retrieve it via the options node. Only works in EDIT mode though...
        if (options.record != undefined && parentRecord == null) {
            parentRecord = options.record;
        }

        //Fallback
        if (parentRecord == null) {
            parentRecord = '<span class="info">unknown</span>';
        }

        //Content of the cursor box
        var array = [
            { 'Field name': fieldname },
            { [TypeOrRecordlabel]: type },
            { 'Parent record': parentRecord },
            { 'Structure id': options['structurekey'] },
            { 'Model & rev.': componentJSON.mNumber },
            { 'Model name': componentJSON.title },
            { 'Hint': '<span class="info">Hold CTRL to freeze the panel to select and copy data.</span>' }
        ];

        //Remove all previous content
        while (cursorBox.firstChild) {
            cursorBox.removeChild(cursorBox.firstChild);
        }

        //Add the new content
        cursorBox.appendChild(createUlFromJSON(array, 'cursor_box_content'));

        //Show the populated box
        cursorBox.classList.add('show');
    };
}

//Get the 'options' node of a DOM element
function getOptionsNode(element) {

    var data = $(element).data('handler');

    if (data == null) {
        return null;
    }

    return data.options;
}

//
function getParentRecordString() {

    var pagewrapper = document.querySelector(".pagewrapper");

    if (pagewrapper == null) {
        return;
    }

    var pageOptions = getOptionsNode(pagewrapper);

    if (pageOptions == null) {
        return;
    }
    var jsonNode = JSON.parse(pageOptions.expressioncontext);

    if (jsonNode == null) {
        return;
    }

    return jsonNode.levels[0];

}

//Get the JSON that has been stored in an architect-link element earlier by the architect_links.js script
function getComponentJsonFromArchitectLink(e) {

    if (e == null) {
        return;
    }

    var architectLink = e.parentNode.querySelector(".architect-link");

    if (architectLink == undefined) {
        return;
    }

    // Retrieve the JSON data from the custom data attribute
    var jsonData = architectLink.getAttribute('data-json');

    // Parse the JSON string into a JavaScript object
    return JSON.parse(jsonData);
}

//make the cursor box invisible
function hideCursorBox() {
    return function () {
        if (!cursorBoxIsEnabled()) {
            return;
        }
        if (cursorBox == undefined) { return };
        cursorBox.classList.remove('show');
    };
}

//Generate HTML of an unordered list based on a JSON
function createUlFromJSON(jsonData, id) {

    const ulElement = document.createElement('ul');

    ulElement.id = id;

    jsonData.forEach(item => {

        const [key, value] = Object.entries(item)[0];

        if (key == null) { return; }

        const liElement = document.createElement('li');

        const label = document.createElement('div');
        label.textContent = key;
        label.classList.add('label');

        liElement.appendChild(label);

        const div = document.createElement('div');
        div.innerHTML = value;
        div.classList.add('value');
        liElement.appendChild(div);

        ulElement.appendChild(liElement);
    });

    return ulElement;
}
