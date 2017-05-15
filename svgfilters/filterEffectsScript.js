"use strict";

//  These functions show the picture tab or the text tab. They depend on the markup in the HTML file.

function ShowPicture() {
    var activeTabs = document.querySelectorAll(".tabs a[active]");
    for (var i = 0; i < activeTabs.length; ++i)
        activeTabs[i].removeAttribute("active");

    document.getElementById("pictureTab").setAttribute("active", null);
    document.getElementById("textSection").style.display = "none";
    document.getElementById("pictureSection").style.removeProperty("display");

    var svgTextElements = document.querySelectorAll("svg text");
    for (i = 0; i < svgTextElements.length; ++i) {
        svgTextElements[i].style.display = "none";
    }

}

function ShowText() {
    var activeTabs = document.querySelectorAll(".tabs a[active]");
    for (var i = 0; i < activeTabs.length; ++i)
        activeTabs[i].removeAttribute("active");

    document.getElementById("textTab").setAttribute("active", null);
    document.getElementById("pictureSection").style.display = "none";
    document.getElementById("textSection").style.removeProperty("display");

    var svgTextElements = document.querySelectorAll("svg text");
    for (i = 0; i < svgTextElements.length; ++i) {
        svgTextElements[i].style.removeProperty("display");
    }
}

/*  function removes the filters in the "whichSet" UI collection
*/
function RemoveAllFilters(whichSet) {
    var controlDivs = document.querySelectorAll("#controls" + whichSet + ">div");
    for (var i = controlDivs.length - 1; i >= 0; --i) {
        var id = parseInt(controlDivs[i].id.match(/_(\d+)$/)[1]);
        deleteFilterSet(whichSet, id);
    }
}

var svgns = "http://www.w3.org/2000/svg";

// The id to use when a new filter is added
var g_lastFilterId = 0;

// Is an update to the gray markup box scheduled?
var updating = false;

function ActuallyUpdateSource() {
    var source = "";

    if ((g_textMarkup.length == 0) && (g_pictureMarkup.length == 0)) {
        source += "&lt;!-- no filters --&gt;";
    }
    var i;
    var split;
    var slider;
    var value;
    if (g_pictureMarkup.length != 0) {
        source += "&lt;filter id=\"pictureFilter\" &gt<br>";
        for (i = 0; i < g_pictureMarkup.length; i++) {
            source += "&nbsp;&nbsp;";
            // break the string into three parts to get the filter value
            split = g_pictureMarkup[i].split("!");
            slider = document.getElementById("slider_" + split[1]);
            if ((slider) && (split[2])) {
                value = slider.value;
                source += split[0] + value + split[2] + "<br>";
            }
            else {
                source += split[0] + "<br>";
            }
        }
        source += "&lt;filter /&gt<br>";
    }

    if ((g_textMarkup.length > 0) && (g_pictureMarkup.length > 0)) {
        source += "<br>";
    }

    if (g_textMarkup.length != 0) {
        source += "&lt;filter id=\"textFilter\" &gt<br>";
        for (i = 0; i < g_textMarkup.length; i++) {
            source += "&nbsp;&nbsp;";
            // break the string into three parts to get the filter value
            split = g_textMarkup[i].split("!");
            slider = document.getElementById("slider_" + split[1]);
            if ((slider) && (split[2])) {
                value = slider.value;
                source += split[0] + value + split[2] + "<br>";
            }
            else {
                source += split[0] + "<br>";
            }
        }
        source += "&lt;filter /&gt<br>";
    }

    document.getElementById("markup").innerHTML = source;
    updating = false;
}

function UpdateSource() {
    if (updating != true) {
        updating = true;
        try {
            setTimeout(ActuallyUpdateSource, 100);
        }
        catch (e) {

        }
    }
}

var g_pictureMarkup = [];
var g_textMarkup = [];

function addFilterSet(where, filterType) {
    g_lastFilterId++;

    document.getElementById("filters" + where).selectedIndex = 0;

    var filtersToAdd = []; // Array of all the filters to add to the graph
    var markupToAdd = []; // Array of all the markup to add to the graph

    var targetFilter = {}; // The particular filter that is modified by the slider

    var attribute = ""; // Name of the filter element attribute that is modified by the slider
    var value = 0;
    var min = 0;
    var max = 0;
    var step = 0;

    // Attach a "result" attribute to the last feElement in the Picture or Text filter graph.
    // This allows a complex filter set to refer back to its preceding "SourceGraphic" equivalent.
    // NOTE: We are guaranteed to have at least one valid child because there is a passthrough
    // feComposite (arithmetic) filter element defined in the SVG markup.
    // In the SVG markup, there must be no children after the last feElement (including whitespace).
    var svg = document.getElementById("svgroot");

    //Bugfix for Firefox
    var filters;
    try
    {
        filters = svg.getElementById("filters" + where);
    }
    catch (err)
    {
        filters = document.getElementById("filters" + where);
    }
    
    filters.lastChild.setAttribute("result", "inputTo_" + g_lastFilterId);

    switch (filterType) {

        case "feGaussianBlur":
            filtersToAdd[0] = document.createElementNS(svgns, "feGaussianBlur");
            targetFilter = filtersToAdd[0];
            attribute = "stdDeviation";
            value = 2;
            min = 0;
            max = 50;
            step = 1;

            markupToAdd[0] = "&lt;feGaussianBlur stdDeviation=\"!" + g_lastFilterId + "!\" /&gt;";

            break;

        case "feMorphology-erode":
            filtersToAdd[0] = document.createElementNS(svgns, "feMorphology");
            filtersToAdd[0].setAttribute("operator", "erode");
            targetFilter = filtersToAdd[0];
            attribute = "radius";
            value = 7;
            min = 1;
            max = 8;
            step = 0.5;

            markupToAdd[0] = "&lt;feMorphology operator=\"erode\" radius=\"!" + g_lastFilterId + "!\" /&gt;";

            break;

        case "feMorphology-dilate":
            filtersToAdd[0] = document.createElementNS(svgns, "feMorphology");
            filtersToAdd[0].setAttribute("operator", "dilate");
            targetFilter = filtersToAdd[0];
            attribute = "radius";
            value = 6;
            min = 1;
            max = 50;
            step = 1;

            markupToAdd[0] = "&lt;feMorphology operator=\"dilate\" radius=\"!" + g_lastFilterId + "!\" /&gt;";
            break;

        case "feColorMatrix-saturate":
            filtersToAdd[0] = document.createElementNS(svgns, "feColorMatrix");
            filtersToAdd[0].setAttribute("type", "saturate");
            targetFilter = filtersToAdd[0];
            attribute = "values";
            value = 2;
            min = 0.1;
            max = 4;
            step = 0.1;

            markupToAdd[0] = "&lt;feColorMatrix type=\"saturate\" values=\"!" + g_lastFilterId + "!\" /&gt;";
            break;

        case "feColorMatrix-huerotate":
            filtersToAdd[0] = document.createElementNS(svgns, "feColorMatrix");
            filtersToAdd[0].setAttribute("type", "hueRotate");
            targetFilter = filtersToAdd[0];
            attribute = "values";
            value = 90;
            min = 1;
            max = 360;
            step = 10;

            markupToAdd[0] = "&lt;feColorMatrix type=\"hueRotate\" values=\"!" + g_lastFilterId + "!\" /&gt;";
            break;

        // Picture-only effect (see "Bevel + Specular Light" for text) 
        // Generates a height map from the image and uses it for a lighting effect 
        case "Height Map + Diffuse Light":
            filtersToAdd[0] = document.createElementNS(svgns, "feColorMatrix");
            filtersToAdd[0].setAttribute("type", "luminanceToAlpha");

            filtersToAdd[1] = document.createElementNS(svgns, "feDiffuseLighting");
            filtersToAdd[1].setAttribute("diffuseConstant", 1);
            filtersToAdd[1].setAttribute("surfaceScale", 10);
            filtersToAdd[1].setAttribute("result", "diffuse" + g_lastFilterId);
            targetFilter = document.createElementNS(svgns, "feDistantLight");
            targetFilter.setAttribute("elevation", 28);
            filtersToAdd[1].appendChild(targetFilter);

            filtersToAdd[2] = document.createElementNS(svgns, "feComposite");
            filtersToAdd[2].setAttribute("operator", "in");
            filtersToAdd[2].setAttribute("in2", "inputTo_" + g_lastFilterId);

            // TODO: Uncomment this to preserve the color of the image, the particular 
            // sample photo doesn't look good when we add color back in
            //filtersToAdd[3] = document.createElementNS(svgns, "feBlend");
            //filtersToAdd[3].setAttribute("mode", "multiply");
            //filtersToAdd[3].setAttribute("in2", "inputTo_" + g_lastFilterId);

            attribute = "azimuth";
            value = 90;
            min = 0;
            max = 360;
            step = 5;

            markupToAdd[0] = "&lt;feColorMatrix type=\"luminanceToAlpha\" /&gt;<br>&lt;feDiffuseLighting diffuseConstant=\"1\" surfaceScale=\"10\" result=\"diffuse3\"&gt;<br>&lt;feDistantLight elevation=\"28\" azimuth=\"!" + g_lastFilterId + "!\" /&gt;&lt;/feDiffuseLighting&gt;<br>&lt;feComposite operator=\"in\" in2=\"inputTo_3\" /&gt;";

            break;

        // Works best on text or objects where there is an interesting alpha mask 
        case "Bevel + Specular Light":
            filtersToAdd[0] = document.createElementNS(svgns, "feGaussianBlur");
            filtersToAdd[0].setAttribute("stdDeviation", 10);

            filtersToAdd[1] = document.createElementNS(svgns, "feSpecularLighting");
            filtersToAdd[1].setAttribute("specularExponent", 20);
            filtersToAdd[1].setAttribute("surfaceScale", 5);
            targetFilter = document.createElementNS(svgns, "feDistantLight");
            targetFilter.setAttribute("elevation", "28");
            filtersToAdd[1].appendChild(targetFilter);

            filtersToAdd[2] = document.createElementNS(svgns, "feComposite");
            filtersToAdd[2].setAttribute("operator", "in");
            filtersToAdd[2].setAttribute("in2", "inputTo_" + g_lastFilterId);

            filtersToAdd[3] = document.createElementNS(svgns, "feComposite");
            filtersToAdd[3].setAttribute("operator", "arithmetic");
            filtersToAdd[3].setAttribute("k2", 1);
            filtersToAdd[3].setAttribute("k3", 1);
            filtersToAdd[3].setAttribute("in2", "inputTo_" + g_lastFilterId);

            attribute = "azimuth";
            value = 90;
            min = 0;
            max = 360;
            step = 10;

            markupToAdd[0] = "&lt;feGaussianBlur stdDeviation=\"10\" /&gt;!" + g_lastFilterId;
            markupToAdd[1] = "&lt;feSpecularLighting specularExponent=\"20\" surfaceScale=\"5\"&gt;!" + g_lastFilterId;
            markupToAdd[2] = "&nbsp;&nbsp;&lt;feDistantLight elevation=\"28\" azimuth=\"!" + g_lastFilterId + "!\" /&gt;";
            markupToAdd[3] = "&lt;/feSpecularLighting&gt;!" + g_lastFilterId;
            markupToAdd[4] = "&lt;feComposite operator=\"in\" in2=\"inputB\" /&gt;!" + g_lastFilterId;
            markupToAdd[5] = "&lt;feComposite operator=\"arithmetic\" k2=\"1\" k3=\"1\" in2=\"inputB\" /&gt;!" + g_lastFilterId;

            break;

        // Works best on text or objects where there is an interesting alpha mask 
        // that has hard edges (blurring an already blurred image is somewhat redundant). 
        case "Drop Shadow":
            // Filters 0 and 1 simulate "SourceAlpha" on the previous filter set output.
            filtersToAdd[0] = document.createElementNS(svgns, "feFlood");
            filtersToAdd[0].setAttribute("flood-color", "black");

            filtersToAdd[1] = document.createElementNS(svgns, "feComposite");
            filtersToAdd[1].setAttribute("operator", "in");
            filtersToAdd[1].setAttribute("in2", "inputTo_" + g_lastFilterId);

            filtersToAdd[2] = document.createElementNS(svgns, "feMorphology");
            filtersToAdd[2].setAttribute("operator", "dilate");
            filtersToAdd[2].setAttribute("radius", 2);

            filtersToAdd[3] = document.createElementNS(svgns, "feGaussianBlur");
            targetFilter = filtersToAdd[3];

            filtersToAdd[4] = document.createElementNS(svgns, "feOffset");
            // Fixed shadow offset - unfortunately we can't dynamically change the position
            // given the effects framework limitations.
            filtersToAdd[4].setAttribute("dx", 15);
            filtersToAdd[4].setAttribute("dy", 15);

            filtersToAdd[5] = document.createElementNS(svgns, "feMerge");
            var mergeNode1 = document.createElementNS(svgns, "feMergeNode");
            var mergeNode2 = document.createElementNS(svgns, "feMergeNode");
            mergeNode2.setAttribute("in", "inputTo_" + g_lastFilterId);
            filtersToAdd[5].appendChild(mergeNode1);
            filtersToAdd[5].appendChild(mergeNode2);

            attribute = "stdDeviation";
            value = 5;
            min = 0;
            max = 20;
            step = 1;

            markupToAdd[0] = "&lt;feFlood flood-color=\"black\" /&gt;!" + g_lastFilterId;
            markupToAdd[1] = "&lt;feComposite operator=\"in\" in2=\"inputA\" /&gt;!" + g_lastFilterId;
            markupToAdd[2] = "&lt;feMorphology operator=\"dilate\" radius=\"2\" /&gt;!" + g_lastFilterId;
            markupToAdd[3] = "&lt;feGaussianBlur stdDeviation=\"!" + g_lastFilterId + "!\" /&gt;";
            markupToAdd[4] = "&lt;feOffset dx=\"15\" dy=\"15\" /&gt;!" + g_lastFilterId;
            markupToAdd[5] = "&lt;feMerge&gt;!" + g_lastFilterId;
            markupToAdd[6] = "&nbsp;&nbsp;&lt;feMergeNode /&gt;!" + g_lastFilterId;
            markupToAdd[7] = "&nbsp;&nbsp;&lt;feMergeNode in=\"inputA\" /&gt;!" + g_lastFilterId;
            markupToAdd[8] = "&lt;/feMerge&gt;!" + g_lastFilterId;

            break;

        // Works best on elements with many colors (e.g. single color text is not very interesting). 
        // Does not have any user-modifiable properties. 
        case "feColorMatrix-sepiatone":
            filtersToAdd[0] = document.createElementNS(svgns, "feColorMatrix");
            filtersToAdd[0].setAttribute("type", "matrix");
            // Matrix values for sepia tone effect
            filtersToAdd[0].setAttribute("values",
            ".343 .669 .119 0 0  " +
            ".249 .626 .130 0 0  " +
            ".172 .334 .111 0 0  " +
            ".000 .000 .000 1 0"
            );

            targetFilter = filtersToAdd[0];

            // This is a dummy attribute that doesn't do anything
            attribute = "data-noop";
            value = 0;
            min = 0;
            max = 0;
            step = 0;

            markupToAdd[0] = "&lt;feColorMatrix type=\"matrix\" values=\".343 .669 .119 0 0 .249 .626 .130 0 0 .172 .334 .111 0 0 .000 .000 .000 1 0\" /&gt;!" + g_lastFilterId;

            break;

        case "Sobel Edge Detection":
            filtersToAdd[0] = document.createElementNS(svgns, "feColorMatrix");
            filtersToAdd[0].setAttribute("type", "luminanceToAlpha");

            filtersToAdd[1] = document.createElementNS(svgns, "feConvolveMatrix");
            filtersToAdd[1].setAttribute("order", 3);
            // Sobel G_x kernel
            filtersToAdd[1].setAttribute("kernelMatrix",
            "-1 0 1  " +
            "-2 0 2  " +
            "-1 0 1"
            );

            filtersToAdd[2] = document.createElementNS(svgns, "feConvolveMatrix");
            filtersToAdd[2].setAttribute("order", 3);
            // Sobel G_y kernel
            filtersToAdd[2].setAttribute("kernelMatrix",
            "-1 -2 -1  " +
            " 0  0  0  " +
            " 1  2  1"
            );

            targetFilter = filtersToAdd[0];

            // This is a dummy attribute that doesn't do anything
            attribute = "data-noop";
            value = 0;
            min = 0;
            max = 0;
            step = 0;

            markupToAdd[0] = "&lt;feColorMatrix type=\"luminanceToAlpha\" /&gt;!" + g_lastFilterId;
            markupToAdd[1] = "&lt;feConvolveMatrix order=\"3\" kernelMatrix=\"-1 -2 -1 0 0 0 1 2 1\" /&gt;!" + g_lastFilterId;
            markupToAdd[2] = "&lt;feConvolveMatrix order=\"3\" kernelMatrix=\"-1 -2 -1 0 0 0 1 2 1\" /&gt;!" + g_lastFilterId;

            break;

        case "Turbulence + Displacement Map":
            filtersToAdd[0] = document.createElementNS(svgns, "feTurbulence");
            filtersToAdd[0].setAttribute("type", "fractalNoise");
            filtersToAdd[0].setAttribute("baseFrequency", 0.015);
            filtersToAdd[0].setAttribute("numOctaves", 2);
            filtersToAdd[0].setAttribute("result", "turbulence_" + g_lastFilterId);

            filtersToAdd[1] = document.createElementNS(svgns, "feDisplacementMap");
            filtersToAdd[1].setAttribute("xChannelSelector", "R");
            filtersToAdd[1].setAttribute("yChannelSelector", "G");
            filtersToAdd[1].setAttribute("in", "inputTo_" + g_lastFilterId);
            filtersToAdd[1].setAttribute("in2", "turbulence_" + g_lastFilterId);
            targetFilter = filtersToAdd[1];

            attribute = "scale";
            value = 65;
            min = 0;
            max = 80;
            step = 5;

            markupToAdd[0] = "&lt;feTurbulence type=\"fractalNoise\" baseFrequency=\"0.015\" numOctaves=\"2\" result=\"turbulence_3\" data-filterId=\"3\" /&gt;!" + g_lastFilterId;
            markupToAdd[1] = "&lt;feDisplacementMap xChannelSelector=\"R\" yChannelSelector=\"G\" in=\"SourceGraphic\" in2=\"turbulence_3\" scale=\"!" + g_lastFilterId + "!\" /&gt;";

            break;
    }

    // Hook up the target parameter to the target filter. This gets modified by the slider.
    targetFilter.setAttribute("id", "filter_" + g_lastFilterId);
    targetFilter.setAttribute(attribute, value);

    // Add all of the filters to the graph. The last filter to be added must produce the final
    // result (the next filter to be added will use this as the input).
    // Also mark each filter element with the ID. This is used to identify all of the members of a 
    // "filter set." Note this value begins at "1" for the first filter added.
    var i;
    for (i = 0; i < filtersToAdd.length; i++) {
        filtersToAdd[i].setAttribute("data-filterId", g_lastFilterId);
        filters.appendChild(filtersToAdd[i]);
    }

    // Add markup
    for (i = 0; i < markupToAdd.length; i++) {
        if (where == "Picture") g_pictureMarkup.push(markupToAdd[i]);
        if (where == "Text") g_textMarkup.push(markupToAdd[i]);
    }

    // Add the controls UX; use CSS in the HTML file to style it
    var controlWrappingDiv = document.createElement("div");
    controlWrappingDiv.className = "filterControlWrapper";
    controlWrappingDiv.id = "controls_" + g_lastFilterId;

    var line1Div = document.createElement("div");
    line1Div.className = "filterControlLine1";
    controlWrappingDiv.appendChild(line1Div);

    var filterName = document.createElement("span");
    filterName.className = "filterControlName";
    filterName.appendChild(document.createTextNode(filterType));
    line1Div.appendChild(filterName);

    var deleteLink = document.createElement("a");
    deleteLink.className = "xIcon";
    deleteLink.href = "javascript:deleteFilterSet('" + where + "'," + g_lastFilterId + ");";
    deleteLink.setAttribute("data-filterId", g_lastFilterId); // This allows us to know which set of filters to delete
    line1Div.appendChild(deleteLink);

    var line2Div = document.createElement("div");
    line2Div.className = "filterControlLine2";
    controlWrappingDiv.appendChild(line2Div);

    var slider = document.createElement("input");
    slider.className = "filterControlSlider";
    slider.id = "slider_" + g_lastFilterId;
    slider.setAttribute("data-filter", "filter_" + g_lastFilterId);
    slider.setAttribute("data-attribute", attribute);
    slider.type = "range";
    slider.min = min;
    slider.max = max;
    slider.step = step;
    slider.value = value;
    slider.setAttribute("onchange", "setFilterAttribute(" + g_lastFilterId + ");");
    line2Div.appendChild(slider);

    document.getElementById("controls" + where).appendChild(controlWrappingDiv);

    UpdateSource();
}

function setFilterAttribute(id) {
    // Get the new value
    var slider = document.getElementById("slider_" + id);
    var value = slider.value;

    // Get the attribute to change    
    var attribute = slider.getAttribute("data-attribute"); // Get the filtername to change
    var filtername = slider.getAttribute("data-filter");

    var filter = document.getElementById(filtername);

    var workaround = false;
    var operator = "";

/*
    if (filter.tagName == "feGaussianBlur") workaround = true;
    if (filter.tagName == "feMorphology") {
        workaround = true;
        operator = filter.getAttribute("operator");
    }
*/

    if (workaround == true) {
        var parent = filter.parentNode;
        var newfilter = document.createElementNS(svgns, filter.tagName);

        newfilter.setAttribute(attribute, value);
        newfilter.setAttribute("id", "filter_" + id);
        newfilter.setAttribute("data-filterId", id);
        if (operator != "") newfilter.setAttribute("operator", operator);
        parent.insertBefore(newfilter, filter);
        parent.removeChild(filter);
    }
    else {
        filter.setAttribute(attribute, value);
    }

    UpdateSource();
}


// Deletes the filter controls UX and all members of the filter set
// Takes a id number (0, 1, etc) and "Text" or "Picture"
function deleteFilterSet(where, id) {
    var filters = document.getElementById("filters" + where);

    // Walk the Pictures or Text feElement tree, and
    // delete any children that contain the matching filterId tag.
    // Walk backwards through the list. This allows us to first read the "result"
    // attribute from the last element in the filter set, and propagate it backwards
    // until it gets copied to the previous filter set's output element.
    var i;
    for (i = filters.childNodes.length - 1; i >= 0; i--) {
        if (parseInt(filters.childNodes[i].getAttribute("data-filterId")) === id) {
            // Simply copy the "result" attribute back one node and repeat
            var resultToCopy = filters.childNodes[i].getAttribute("result");
            filters.childNodes[i - 1].setAttribute("result", resultToCopy);
            filters.removeChild(filters.childNodes[i]);
        }
    }

    if (where == "Text") {
        // Delete the markup
        i = 0;
        do {
            if (g_textMarkup[i].match("!" + id)) {
                g_textMarkup.splice(i, 1);
            }
            else {
                i++;
            }
        }
        while (i < g_textMarkup.length);
    }

    if (where == "Picture") {
        // Delete the markup
        i = 0;
        do {
            if (g_pictureMarkup[i].match("!" + id)) {
                g_pictureMarkup.splice(i, 1);
            }
            else {
                i++;
            }
        }
        while (i < g_pictureMarkup.length);
    }

    // Delete the UX
    var ux = document.getElementById("controls_" + id);
    ux.parentNode.removeChild(ux);

    UpdateSource();
}

//  a set of preset patterns that look cool

function Do20s() {
    ShowText();
    RemoveAllFilters("Text");
    RemoveAllFilters("Picture");
    addFilterSet("Picture", "feColorMatrix-sepiatone");
    addFilterSet("Text", "feMorphology-erode");
}

function Do60s() {
    ShowText();
    RemoveAllFilters("Text");
    RemoveAllFilters("Picture");
    addFilterSet("Picture", "feMorphology-dilate");
    addFilterSet("Text", "Turbulence + Displacement Map");
    addFilterSet("Text", "Bevel + Specular Light");
}

function Do80s() {
    ShowText();
    RemoveAllFilters("Text");
    RemoveAllFilters("Picture");
    addFilterSet("Picture", "Height Map + Diffuse Light");
    addFilterSet("Text", "Drop Shadow");
}

function Do90s() {
    ShowText();
    RemoveAllFilters("Text");
    RemoveAllFilters("Picture");
//    addFilterSet("Picture", "feMorphology-erode");
//    addFilterSet("Text", "feMorphology-dilate");
    addFilterSet("Picture", "feGaussianBlur");
    addFilterSet("Picture", "feMorphology-erode");
    addFilterSet("Picture", "feMorphology-dilate");

    addFilterSet("Text", "feMorphology-erode");
    addFilterSet("Text", "feGaussianBlur");
    addFilterSet("Text", "feMorphology-dilate");
    addFilterSet("Text", "feMorphology-dilate");
    addFilterSet("Text", "feColorMatrix-huerotate");



}

function Do00s() {
    ShowText();
    RemoveAllFilters("Text");
    RemoveAllFilters("Picture");
    addFilterSet("Picture", "Height Map + Diffuse Light");
    addFilterSet("Picture", "Height Map + Diffuse Light");
    addFilterSet("Picture", "Sobel Edge Detection");
    addFilterSet("Picture", "Turbulence + Displacement Map");
    addFilterSet("Text", "Drop Shadow");
    addFilterSet("Text", "feMorphology-erode");
    addFilterSet("Text", "feMorphology-erode");
}
