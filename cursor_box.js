
var cursorBox = document.getElementById('cursor-box');

if (cursorBoxIsEnabled()) {
    addEventListenersToElementContainers();
}

function cursorBoxIsEnabled() {

    var enabled = document.body.classList.contains('enable-architect-links');

    if (enabled == false) {
        return false;
    }

    if (cursorBox == undefined) {
        return false
    };

    return !cursorBox.classList.contains('freeze');
}

function addEventListenersToElementContainers() {

    // Remove existing event listeners first
    removeEventListenersFromElementContainers();

    var els = document.getElementsByClassName('elementcontainer');

    for (var i = 0; i < els.length; i++) {

        els[i].addEventListener('mouseenter', populateCursorBox());

        els[i].addEventListener('mouseleave', hideCursorBox());
    }
}

function removeEventListenersFromElementContainers() {
    var els = document.getElementsByClassName('elementcontainer');
    for (var i = 0; i < els.length; i++) {
        els[i].removeEventListener('mouseenter', populateCursorBox);
        els[i].removeEventListener('mouseleave', hideCursorBox);
    }
}

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

        var data = $(hoveredElement).data('handler');

        if (data == null) {
            return;
        }

        var options = data.options;

        if (options == null) {
            return;
        }

        var fieldname = (options['contextName'] == null) ? '<span class="info">Not a database field</span>' : options['contextName'];

        var type = options['typename'];

        //Add info about the record type and id for searchlinks if possible
        if (options.onclicktask != undefined) {
            var pageLoadString = options.onclicktask.process.parameters.page;
            var recordStringWithID = pageLoadString.substring(pageLoadString.indexOf('[<"record"') + 11, pageLoadString.indexOf('>]'));
            type = recordStringWithID;
        }

        if (type == undefined) {
            type = 'unknown';
        }

        var record = '<span class="info">Switch to edit mode to see the parent record type and its id</span>';

        if (options.record != undefined) {
            record = options.record;
        }

        var array = [
            { 'Field name': fieldname },
            { 'Type': type },
            { 'Parent record': record },
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
        cursorBox.appendChild(createUlFromJSON(array));

        //Show the populated box
        cursorBox.classList.add('show');
    };
}

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

function hideCursorBox() {
    return function () {
        if (!cursorBoxIsEnabled()) {
            return;
        }
        if (cursorBox == undefined) { return };
        cursorBox.classList.remove('show');
    };
}

function createUlFromJSON(jsonData) {

    const ulElement = document.createElement('ul');

    ulElement.id = 'cursor_box_content';

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
