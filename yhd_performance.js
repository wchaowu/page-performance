/* yhd_performance.js 
 * https://github.com/wchaowu/page-performance.git
 * Print out window.performance information.
 * https://developer.mozilla.org/en-US/docs/Navigation_timing
  
 * 目前IE10+和chrome31+已完整支持，firefox不支持
 * performance.getEntriesByName("loadTime")[0].duration */
 
var gZeroLeft = 0;
var gZeroTop = 0;
var gWinWidth = window.innerWidth || document.documentElement.clientWidth;

function findImages() {
    var aElems = document.getElementsByTagName('*');
    var re = /url\(("?http.*"?)\)/ig;
    for ( var i=0, len = aElems.length; i < len; i++ ) {
        var elem = aElems[i];
        var style = window.getComputedStyle(elem);
        var url = elem.src || elem.href;
        var hasImage = 0;
        var fixed = 0;
        var body = 0;
        re.lastIndex = 0; // reset state of regex so we catch repeating spritesheet elements
        if(elem.tagName == 'IMG') {
            hasImage = 1;
        }
        if(style['backgroundImage']) {
            var backgroundImage = style['backgroundImage'];
            var matches = re.exec(style['backgroundImage']);
            if (matches && matches.length > 1){
                url = backgroundImage.substring(4);
                url = url.substring(0, url.length - 1);
                url = url.replace(/"/, "");
                url = url.replace(/"/, "");
                hasImage = 1;
                if(elem.tagName == 'BODY'){
                    body = 1;
                }
            }
        }
        if(style['visibility'] == "hidden") {
            hasImage = 0;
        }
        if(hasImage == 1){
            if ( url ) {
                var entry = performance.getEntriesByName(url)[0];
                if ( entry ) {
                    var xy = getCumulativeOffset(elem, url);
                    var wh = elem.getBoundingClientRect();
                    var width = wh.width;
                    var height = wh.height;
                    if(width > 10){
                        if(height > 10){
                            placeMarker(xy, width, height, entry, body, url);
                        }
                    }
                }
            }
        }
    }
}

function placeMarker(xy, width, height, entry, body, url) {
    var heat = entry.responseEnd / loaded;
    // adjust size of fonts/padding based on width of overlay
    if(width < 170){
        var padding = 12;
        var size = 12;
    }else if(width > 400){
        var padding = 13;
        var size = 26;
    }else{
        var padding = 9;
        var size = 18;
    }
    // check for overlay that matches viewport and assume it's like a background image on body
    if(width == document.documentElement.clientWidth){
        if(height >= document.documentElement.clientHeight){
            body = 1;
        }
    }
    // adjust opacity if it's the body element and position label top right
    if(body == 1){
        var opacity = 0.6;
        var size = 18;
        var align = "right";
        var paddingTop = 10;
        var bodyText = "BODY ";
    }else{
        var opacity = 0.925;
        var align = "center";
        var paddingTop = (height/2)-padding;
        var bodyText = "";
    }
    var marker = document.createElement("div");
    marker.className = "perfmap";
    marker.setAttribute("data-ms", parseInt(entry.responseEnd));
    marker.setAttribute("data-body", body);
    marker.setAttribute("dir", "ltr"); // Force LTR display even if injected on an RTL page
    marker.style.cssText = "position:absolute; transition: 0.5s ease-in-out; box-sizing: border-box; color: #fff; padding-left:10px; padding-right:10px; line-height:14px; font-size: " + size + "px; font-weight:800; font-family:\"Helvetica Neue\",sans-serif; text-align:" + align + "; opacity: " + opacity + "; " + heatmap(heat) + " top: " + xy.top + "px; left: " + xy.left + "px; width: " + width + "px; height:" + height + "px; padding-top:" + paddingTop + "px; z-index: 4000;";
    if(width > 50){
        if(height > 15 ){
            marker.innerHTML = bodyText + parseInt(entry.responseEnd) + "ms (" + parseInt(entry.duration) + "ms)";
        }
    }
    document.body.appendChild(marker);
}

function heatmap(heat) {
    if ( heat < 0.16 ) {
        return "background: #1a9850;"
    }
    else if ( heat < 0.32 ) {
        return "background: #66bd63;"
    }
    else if ( heat < 0.48 ) {
        return "background: #a6d96a;"
    }
    else if ( heat < 0.64 ) {
        return "background: #fdae61;"
    }
    else if ( heat < 0.8 ) {
        return "background: #f46d43;"
    }else{
	    return "background: #d73027;"
    }
}

function getCumulativeOffset(obj, url) {
    var left, top;
    left = top = 0;
    if (obj.offsetParent) {
        do {
            left += obj.offsetLeft;
            top  += obj.offsetTop;
        } while (obj = obj.offsetParent);
    }
    if ( 0 == top ) {
        left += gZeroLeft;
        top += gZeroTop;
    }
    return {
        left: left,
        top: top,
    };
}

// give visual feedback asap
var loading = document.createElement("div");
loading.id = "perfmap-loading";
loading.innerHTML = "Creating PerfMap";
loading.style.cssText = "position:absolute; z-index:6000; left:40%; top:45%; background-color:#000; color:#fff; padding:20px 30px; font-family:\"Helvetica Neue\",sans-serif; font-size:24px; font-weight:800;border:2px solid white;";
document.body.appendChild(loading);

// get full page load time to calculate heatmap max
var loaded = performance.timing.loadEventEnd - performance.timing.navigationStart;

// backend
var backend = performance.timing.responseEnd - performance.timing.navigationStart;
var backendLeft = (backend / loaded)*100;

// first paint in chrome from https://github.com/addyosmani/timing.js
var hasFirstPaint = 0;
if (window.chrome && window.chrome.loadTimes) {
	var paint = window.chrome.loadTimes().firstPaintTime * 1000;
	var firstPaint = paint - (window.chrome.loadTimes().startLoadTime*1000);
	var firstPaintLeft = (firstPaint / loaded)*100;
	hasFirstPaint = 1;
}

// remove any exisiting "perfmap" divs on second click
var elements = document.getElementsByClassName("perfmap");
while(elements.length > 0){
    elements[0].parentNode.removeChild(elements[0]);
}

// build bottom legend
var perfmap = document.createElement("div");
perfmap.id = "perfmap";
var legend = "<div style='width:16.666666667%; height: 50px; float:left; background-color:#1a9850;'></div><div style='width:16.666666667%; height: 50px; float:left; background-color:#66bd63;'></div><div style='width:16.666666667%; height: 50px; float:left; background-color:#a6d96a;'></div><div style='width:16.666666667%; height: 50px; float:left; background-color:#fdae61;'></div><div style='width:16.666666667%; height: 50px; float:left; background-color:#f46d43;'></div><div style='width:16.666666667%; height: 50px; float:left; background-color:#d73027;'></div><div style='position:absolute; z-index:2; right:0px; padding-top:5px; padding-right:10px;height:100%;color:#fff;'>Fully Loaded " + parseInt(loaded) + "ms</div><div id='perfmap-timeline' style='position:absolute; z-index:4; left:-100px; border-left:2px solid white;height:100%;'></div>";
if(hasFirstPaint == 1){
	legend += "<div style='position:absolute; z-index:3; left:" + firstPaintLeft + "%; padding-top:5px; border-left:2px solid white;padding-left:5px;height:100%;color:#fff;'>First Paint " + parseInt(firstPaint) + "ms</div></div>";
}
perfmap.style.cssText = "position: fixed; width:100%; bottom:0; left:0; z-index:5000; height: 25px; color:#fff; font-family:\"Helvetica Neue\",sans-serif; font-size:14px; font-weight:800; line-height:14px;";
perfmap.innerHTML = legend;
document.body.appendChild(perfmap);

// build heatmap
findImages();

// remove loading message
loading.remove();

// mouse events to move timeline around on hover
var elements = document.getElementsByClassName("perfmap");
var timeline = document.getElementById('perfmap-timeline');
for ( var i=0, len = elements.length; i < len; i++ ) {
	elements[i].onmouseover = function(){
    	var timelineLeft = document.documentElement.clientWidth * (this.dataset.ms / loaded);
    	if(this.dataset.body != "1"){
			this.style.opacity = 1;
    	}
    	timeline.style.cssText = "opacity:1; transition: 0.5s ease-in-out; transform: translate("+ parseInt(timelineLeft) + "px,0); position:absolute; z-index:4; border-left:2px solid white; height:100%;";
    }
    elements[i].onmouseout = function(){		
    	var timelineLeft = document.documentElement.clientWidth * (this.dataset.ms / loaded);
    	if(this.dataset.body != "1"){
    		this.style.opacity = 0.925;
    	}
    	timeline.style.cssText = "opacity:0; transition: 0.5s ease-in-out; transform: translate("+ parseInt(timelineLeft) + "px,0); position:absolute; z-index:4; border-left:2px solid white; height:100%;";
    }
}

/**
页面的内存使用情况
 */
var MemoryStats = function (){

	var msMin	= 100;
	var msMax	= 0;
	var GRAPH_HEIGHT = 30;
	var redrawMBThreshold = GRAPH_HEIGHT;

	var container	= document.createElement( 'div' );
	container.id	= 'stats';
	container.style.cssText = 'width:80px;height:48px;opacity:0.9;cursor:pointer;overflow:hidden;z-index:10000;will-change:transform;';

	var msDiv	= document.createElement( 'div' );
	msDiv.id	= 'ms';
	msDiv.style.cssText = 'padding:0 0 3px 3px;text-align:left;background-color:#020;';
	container.appendChild( msDiv );

	var msText	= document.createElement( 'div' );
	msText.id	= 'msText';
	msText.style.cssText = 'color:#0f0;font-family:Helvetica,Arial,sans-serif;font-size:9px;font-weight:bold;line-height:15px';
	msText.innerHTML= 'Memory';
	msDiv.appendChild( msText );

	var msGraph	= document.createElement( 'div' );
	msGraph.id	= 'msGraph';
	msGraph.style.cssText = 'position:relative;width:74px;height:' + GRAPH_HEIGHT + 'px;background-color:#0f0';
	msDiv.appendChild( msGraph );

	while ( msGraph.children.length < 74 ) {

		var bar = document.createElement( 'span' );
		bar.style.cssText = 'width:1px;height:' + GRAPH_HEIGHT + 'px;float:left;background-color:#131';
		msGraph.appendChild( bar );

	}

	var updateGraph = function ( dom, height, color ) {

		var child = dom.appendChild( dom.firstChild );
		child.style.height = height + 'px';
		if( color ) child.style.backgroundColor = color;

	};

	var redrawGraph = function(dom, oHFactor, hFactor) {
		[].forEach.call(dom.children, function(c) {
			var cHeight = c.style.height.substring(0, c.style.height.length-2);

			// Convert to MB, change factor
			var newVal = GRAPH_HEIGHT - ((GRAPH_HEIGHT - cHeight)/oHFactor) * hFactor;

			c.style.height = newVal + 'px';
		});
	};

	// polyfill usedJSHeapSize
	if (window.performance && !performance.memory){
		performance.memory = { usedJSHeapSize : 0, totalJSHeapSize : 0 };
	}

	// support of the API?
	if( performance.memory.totalJSHeapSize === 0 ){
		console.warn('totalJSHeapSize === 0... performance.memory is only available in Chrome .');
	}

	var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
	var precision;
	var i;
	function bytesToSize( bytes, nFractDigit ){
		if (bytes === 0) return 'n/a';
		nFractDigit	= nFractDigit !== undefined ? nFractDigit : 0;
		precision = Math.pow(10, nFractDigit);
		i = Math.floor(Math.log(bytes) / Math.log(1024));
		return Math.round(bytes*precision / Math.pow(1024, i))/precision + ' ' + sizes[i];
	}

	// TODO, add a sanity check to see if values are bucketed.
	// If so, remind user to adopt the --enable-precise-memory-info flag.
	// open -a "/Applications/Google Chrome.app" --args --enable-precise-memory-info

	var lastTime	= Date.now();
	var lastUsedHeap = performance.memory.usedJSHeapSize;
	var delta = 0;
	var color = "#131";
	var ms = 0;
	var mbValue = 0;
	var factor = 0;
	var newThreshold = 0;

	return {
		domElement: container,

		update: function () {

			// update at 30fps
			if( Date.now() - lastTime < 1000/30 ) return;
			lastTime = Date.now();

			delta = performance.memory.usedJSHeapSize - lastUsedHeap;
			lastUsedHeap = performance.memory.usedJSHeapSize;

			// if memory has gone down, consider it a GC and draw a red bar.
			color = delta < 0 ? '#830' : '#131';

			ms = lastUsedHeap;
			msMin = Math.min( msMin, ms );
			msMax = Math.max( msMax, ms );
			msText.textContent = "Mem: " + bytesToSize(ms, 2);

			mbValue	= ms / (1024*1024);
			
			if(mbValue > redrawMBThreshold) {
				factor = (mbValue - (mbValue % GRAPH_HEIGHT))/ GRAPH_HEIGHT;
				newThreshold = GRAPH_HEIGHT * (factor + 1);
				redrawGraph(msGraph, GRAPH_HEIGHT/redrawMBThreshold, GRAPH_HEIGHT/newThreshold);
				redrawMBThreshold = newThreshold;
			}

			updateGraph( msGraph, GRAPH_HEIGHT-mbValue*(GRAPH_HEIGHT/redrawMBThreshold), color);


		}

	};

};

(function (){
	 var stats = new MemoryStats();

    var elem = stats.domElement;
    elem.style.position = 'fixed';
    elem.style.right    = '0px';
    elem.style.top   = '0px';
    elem.style.zIndex   = 100000;

    document.body.appendChild( stats.domElement );

    requestAnimationFrame(function rAFloop(){
      stats.update();
      requestAnimationFrame(rAFloop);
    });
})();

if (typeof module !== "undefined" && module.exports) {
	module.exports = MemoryStats;
}


//加速速度优化


(function () {

  var t = window.performance.timing;
  var lt = window.chrome && window.chrome.loadTimes && window.chrome.loadTimes();
  var timings = [];

  timings.push({
    label: "时间截止 Page Loaded",
    time: t.loadEventEnd - t.navigationStart + "ms"
  });
  timings.push({
    label: "时间截止 DOMContentLoaded",
    time: t.domContentLoadedEventEnd - t.navigationStart + "ms"
  });
  timings.push({
    label: "总共的响应时间 Response Time",
    time: t.responseEnd - t.requestStart + "ms"
  });
  timings.push({
    label: " 连接时间Connection",
    time: t.connectEnd - t.connectStart + "ms"
  });
  timings.push({
    label: "响应时间",
    time: t.responseEnd - t.responseStart + "ms"
  });
  timings.push({
    label: "Domain Lookup",
    time: t.domainLookupEnd - t.domainLookupStart + "ms"
  });
  timings.push({
    label: "Dns查询时间",
    time: t.loadEventEnd - t.loadEventStart + "ms"
  });
  timings.push({
    label: "页面卸载时间",
    time: t.unloadEventEnd - t.unloadEventStart + "ms"
  });
  timings.push({
    label: "DOMContentLoaded Event",
    time: t.domContentLoadedEventEnd - t.domContentLoadedEventStart + "ms"
  });
  if(lt) {
    if(lt.wasNpnNegotiated) {
      timings.push({
        label: "NPN negotiation protocol",
        time: lt.npnNegotiatedProtocol
      });
    }
    timings.push({
      label: "Connection Info",
      time: lt.connectionInfo
    });
    timings.push({
      label: "First paint after Document load",
      time: Math.ceil(lt.firstPaintTime - lt.finishDocumentLoadTime) + "ms"
    });
  }

  var navigation = window.performance.navigation;
  var navigationTypes = { };
  navigationTypes[navigation.TYPE_NAVIGATENEXT || 0] = "Navigation started by clicking on a link, or entering the URL in the user agent's address bar, or form submission.",
  navigationTypes[navigation.TYPE_RELOAD] = "Navigation through the reload operation or the location.reload() method.",
  navigationTypes[navigation.TYPE_BACK_FORWARD] = "Navigation through a history traversal operation.",
  navigationTypes[navigation.TYPE_UNDEFINED] = "Navigation type is undefined.",

  console.group("window.performance");

  console.log(window.performance);

  console.group("Navigation Information");
  console.log(navigationTypes[navigation.type]);
  console.log("Number of redirects that have taken place: ", navigation.redirectCount)
  console.groupEnd("Navigation Information");

  console.group("Timing");
  console.log(window.performance.timing);
  console.table(timings, ["label", "time"]);
  console.groupEnd("Timing");

  console.groupEnd("window.performance");

})();
